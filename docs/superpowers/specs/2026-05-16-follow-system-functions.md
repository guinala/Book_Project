# Sistema de follow sobre Cloud Functions

**Date:** 2026-05-16
**Branch:** Develop
**Related specs:** [2026-05-13-profile-firebase-integration-design.md](./2026-05-13-profile-firebase-integration-design.md)

---

## Overview

El perfil de otro usuario debe tener un botón de seguir. Comportamiento:

- **Perfil público** → pulsar el botón sigue al usuario al instante.
- **Perfil privado** → el botón aparece igual, pero pulsar no sigue al instante: **envía una solicitud** que el dueño acepta o rechaza.

Además, este spec **arregla un bug existente**: `followUser`/`unfollowUser` fallan hoy (`[useProfile] follow failed`) porque su `writeBatch` incluye un `increment` sobre el `followersCount` del **otro** usuario, y la regla `Users/{uid}` (`allow write: if isOwner`) deniega esa escritura cross-documento → el batch entero se rechaza.

La solución unificada: **todo el sistema de follow que necesite escrituras cross-documento pasa por Cloud Functions.**

---

## Decisiones de diseño (justificación)

### Por qué Cloud Functions y no solo reglas

Las operaciones del sistema se parten en dos grupos:

| Operación | Escribe sobre… | ¿Necesita función? |
|---|---|---|
| Enviar solicitud | doc que el solicitante crea bajo el target | **No** — regla `create` |
| Rechazar solicitud | doc bajo el target, lo borra el target | **No** — regla `delete` (owner) |
| Cancelar solicitud | la propia solicitud, la borra el solicitante | **No** — regla `delete` |
| **Seguir (público)** | aristas + **contador del target** | **Sí** |
| **Dejar de seguir** | aristas + **contador del target** | **Sí** |
| **Aceptar solicitud** | arista `following` **bajo el solicitante** + contadores | **Sí** |

Las tres últimas no se pueden resolver bien solo con reglas, por dos motivos:

1. **El contador sería falsificable.** Para permitir `followUser` con reglas habría que dejar que un no-dueño incremente `followersCount` ajeno. Las reglas evalúan **cada escritura de forma aislada** — la regla del contador no puede comprobar si en el mismo batch se creó también la arista de follow real. Así que cualquier usuario autenticado podría incrementar/decrementar el contador de seguidores de cualquiera, a voluntad.

2. **Aceptar exige escribir "en nombre de" otro.** Aceptar crea `Users/{solicitante}/following/{target}` — un documento bajo el doc del **solicitante**, pero la acción la ejecuta el **target**. Expresarlo en reglas es posible (con `exists()` que verifique la solicitud pendiente), pero produce un entramado de reglas frágil, y la atomicidad de las ~5 escrituras queda a merced del cliente.

**El fondo:** las reglas de Firestore son una capa de **autorización** ("¿se permite esta escritura concreta?"), no de **integridad transaccional**. Un follow es una transacción multi-documento con un contador derivado que no debe poder falsificarse. Una Cloud Function corre con privilegios de admin, hace todas las escrituras como una unidad atómica en servidor, y deja el contador como dato **autoritativo del servidor, no falsificable**.

### Reparto función / cliente

Solo van por Cloud Function las operaciones que **lo necesitan** (escrituras cross-documento / contadores): `followUser`, `unfollowUser`, `acceptFollowRequest`. Las demás (`sendFollowRequest`, `rejectFollowRequest`, `cancelFollowRequest`) son escrituras del actor sobre docs que posee → se quedan como escrituras de cliente con reglas. Esto minimiza el número de funciones y la superficie de despliegue.

### Endurecimiento de reglas posible gracias a las funciones

Como follow/unfollow dejan de ser escrituras de cliente, las subcolecciones `following` y `followers` pasan a `write: if false` para clientes. Solo la función (admin) las escribe. Resultado: el grafo de seguidores y los contadores quedan **100% autoritativos en servidor** — un cliente no puede fabricar una arista de follow falsa ni descuadrar el contador.

### `followRequests` como subcolección del target

La solicitud se guarda en `Users/{targetUid}/followRequests/{requesterUid}` (subcolección del **target**), no en una colección raíz. Motivo: la solicitud "pertenece" a la bandeja de entrada del target — gatearla con `isOwner(targetUid)` para que solo el target lea sus solicitudes es directo. El ID del doc es el `requesterUid` → un usuario no puede tener dos solicitudes pendientes hacia el mismo target (unicidad gratis por ID).

### Estados del botón

`Seguir` (no sigue, sin solicitud) → `Solicitado` (solicitud pendiente, cancelable) → `Siguiendo`. Para un perfil público nunca se pasa por `Solicitado`.

---

## Modelo de datos

### `Users/{targetUid}/followRequests/{requesterUid}` — NUEVO

```ts
requesterUid: string
createdAt: Timestamp
// denormalizados para pintar la lista de solicitudes sin lecturas extra:
requesterName: string
requesterUsername: string
requesterPhotoUrl: string
```

Sin cambios de forma en `following` / `followers` / `followersCount` / `followingCount`.

---

## Reglas Firestore — cambios

Dentro de `match /Users/{uid}`:

```
// Las aristas las escribe SOLO la Cloud Function (admin) — el cliente no.
match /following/{x}          { allow read: if isOwner(uid); allow write: if false; }
match /followers/{followerId} {
  allow read:  if isOwner(uid) || (isSignedIn() && request.auth.uid == followerId);
  allow write: if false;
}

// Solicitudes de seguimiento
match /followRequests/{requesterUid} {
  // el dueño ve su bandeja; el solicitante puede ver/consultar la suya
  allow read:   if isOwner(uid) || (isSignedIn() && request.auth.uid == requesterUid);
  // enviar: solo el propio solicitante, y el payload apunta a él
  allow create: if isSignedIn()
                && request.auth.uid == requesterUid
                && request.resource.data.requesterUid == requesterUid;
  // borrar: el target (rechaza) o el solicitante (cancela)
  allow delete: if isOwner(uid) || (isSignedIn() && request.auth.uid == requesterUid);
  // sin update
}
```

> Nota: aceptar una solicitud **no** se hace borrando aquí — lo hace la función `acceptFollowRequest`, que borra la solicitud y crea las aristas atómicamente. El `allow delete` de arriba cubre solo rechazar/cancelar.

`Users/{uid}` (`allow write: if isOwner`) no cambia — los contadores los escribe la función como admin, saltándose las reglas.

---

## Cloud Functions (`functions/`)

Tres *callable functions* (`onCall`). Esbozo (ajustar imports al setup de tu carpeta `functions/`):

### `followUser`

```ts
export const followUser = onCall(async (request) => {
  const followerId = request.auth?.uid;
  if (!followerId) throw new HttpsError("unauthenticated", "Sesión requerida");
  const targetId = request.data?.targetUid;
  if (!targetId || targetId === followerId) {
    throw new HttpsError("invalid-argument", "targetUid inválido");
  }

  const db = admin.firestore();
  const targetSnap = await db.doc(`Users/${targetId}`).get();
  if (!targetSnap.exists) throw new HttpsError("not-found", "Usuario no encontrado");

  // Perfil privado → no se sigue directamente, hay que solicitar
  if (targetSnap.data()?.isPublic === false) {
    throw new HttpsError("failed-precondition", "Perfil privado: usa una solicitud");
  }

  const followingRef = db.doc(`Users/${followerId}/following/${targetId}`);
  if ((await followingRef.get()).exists) return { ok: true }; // idempotente

  const ts = admin.firestore.FieldValue.serverTimestamp();
  const inc = admin.firestore.FieldValue.increment(1);
  const batch = db.batch();
  batch.set(followingRef, { createdAt: ts });
  batch.set(db.doc(`Users/${targetId}/followers/${followerId}`), { createdAt: ts });
  batch.update(db.doc(`Users/${followerId}`), { followingCount: inc });
  batch.update(db.doc(`Users/${targetId}`), { followersCount: inc });
  await batch.commit();
  return { ok: true };
});
```

### `unfollowUser`

Igual pero a la inversa: comprueba que la arista existe (idempotente si no), borra ambas aristas y aplica `increment(-1)` a los dos contadores.

### `acceptFollowRequest`

```ts
export const acceptFollowRequest = onCall(async (request) => {
  const targetId = request.auth?.uid;            // el que acepta = el dueño del perfil
  if (!targetId) throw new HttpsError("unauthenticated", "Sesión requerida");
  const requesterId = request.data?.requesterUid;
  if (!requesterId) throw new HttpsError("invalid-argument", "requesterUid inválido");

  const db = admin.firestore();
  const reqRef = db.doc(`Users/${targetId}/followRequests/${requesterId}`);
  if (!(await reqRef.get()).exists) {
    throw new HttpsError("not-found", "No hay solicitud de ese usuario");
  }

  const ts = admin.firestore.FieldValue.serverTimestamp();
  const inc = admin.firestore.FieldValue.increment(1);
  const batch = db.batch();
  batch.set(db.doc(`Users/${requesterId}/following/${targetId}`), { createdAt: ts });
  batch.set(db.doc(`Users/${targetId}/followers/${requesterId}`), { createdAt: ts });
  batch.update(db.doc(`Users/${requesterId}`), { followingCount: inc });
  batch.update(db.doc(`Users/${targetId}`), { followersCount: inc });
  batch.delete(reqRef);
  await batch.commit();
  return { ok: true };
});
```

Las tres se saltan las reglas (corren como admin), así que la escritura cross-documento que hoy rompe el batch ya no es un problema. La verificación de permisos la hace la propia función: `request.auth.uid` es el llamante autenticado, imposible de falsear desde el cliente.

---

## Cambios en el cliente

### `src/services/firebase/firebaseFollows.ts`

- `followUser(targetUid)` y `unfollowUser(targetUid)` dejan de escribir Firestore directamente — pasan a invocar las *callable functions* con `httpsCallable` del SDK de Firebase. Mucho más cortas.
- Nuevas: `sendFollowRequest(targetUid, requesterProfile)` (escritura de cliente: crea el doc en `followRequests`), `cancelFollowRequest(targetUid)` y `rejectFollowRequest(requesterUid)` (borrados de cliente), `acceptFollowRequest(requesterUid)` (invoca la función), `getFollowRequests()` (lee `Users/{me}/followRequests`).
- `checkIsFollowing` no cambia. Nueva `checkHasPendingRequest(targetUid)` — comprueba si existe `Users/{target}/followRequests/{me}`.

### `src/hooks/useProfile.ts`

- En fase 1, además de `checkIsFollowing`, comprobar `checkHasPendingRequest` → nuevo estado `hasPendingRequest`.
- `follow()` decide según `profile.isPublic`:
  - público → `followUser` (función).
  - privado → `sendFollowRequest` → marca `hasPendingRequest`.
- `unfollow()` → `unfollowUser` (función).
- Nueva acción `cancelRequest()` → `cancelFollowRequest` → limpia `hasPendingRequest`.
- Exponer `hasPendingRequest`, `cancelRequest`.

### `src/components/profile/sections/ProfileHeader.tsx`

El botón de acción para perfil ajeno pasa a tres estados:
- `isFollowing` → "Siguiendo" (click → unfollow).
- `hasPendingRequest` → "Solicitado" (click → cancelar solicitud).
- ninguno → "Seguir" (click → follow, que internamente sigue o solicita según público/privado).

### Bandeja de solicitudes (UI nueva)

Una vista/sección donde el usuario ve sus `followRequests` entrantes y acepta/rechaza cada una. Mínimo: una lista de `ProfileCard` con botones aceptar/rechazar. Ubicación a decidir (un modal desde el perfil propio, o una página dedicada).

---

## Plan por batches

| # | Batch | Contenido |
|---|-------|-----------|
| 1 | Cloud Functions | `followUser`, `unfollowUser`, `acceptFollowRequest` en `functions/` + deploy |
| 2 | Reglas | `followRequests` + endurecer `following`/`followers` a `write: if false` |
| 3 | Servicio cliente | `firebaseFollows.ts`: follow/unfollow vía `httpsCallable` + funciones de solicitud |
| 4 | Hook + botón | `useProfile` con `hasPendingRequest`/`cancelRequest` + `ProfileHeader` con 3 estados |
| 5 | Bandeja de solicitudes | UI para aceptar/rechazar |

> Orden importante: el Batch 1 (funciones desplegadas) va **antes** del Batch 3 — si el cliente llama a una función que no existe aún, falla. Y el Batch 2 (reglas `write: if false`) va junto o después del 3, no antes: si endureces las reglas antes de que el cliente use las funciones, follow/unfollow quedarían rotos en el intervalo.

---

## Verificación

- Seguir un perfil **público** desde otra cuenta → "Siguiendo" al instante, contador `followersCount` del target sube. (Arregla el bug actual.)
- Dejar de seguir → vuelve a "Seguir", contador baja.
- Seguir un perfil **privado** → botón pasa a "Solicitado", se crea `followRequests/{yo}` en el target, **no** se crean aristas ni sube el contador.
- Cancelar la solicitud → vuelve a "Seguir", la solicitud desaparece.
- El target ve la solicitud en su bandeja; **aceptar** → se crean las aristas, sube el contador, la solicitud desaparece, y el solicitante pasa a ver "Siguiendo".
- **Rechazar** → la solicitud desaparece, sin aristas.
- Spot-check de seguridad: desde la consola del navegador, intentar `setDoc` directo en `Users/{otro}/followers/{yo}` → **denegado** (`write: if false`). Intentar incrementar `followersCount` ajeno → denegado.

---

## Fuera de alcance

- Notificaciones push al recibir una solicitud / al ser aceptado.
- Lista de "solicitudes enviadas" (el solicitante viendo todas sus solicitudes pendientes en un sitio) — el estado por-perfil (`hasPendingRequest`) sí está.
- Re-solicitar con cooldown tras un rechazo.
- Garbage-collection de `followRequests` huérfanas si una cuenta se borra.
