import { usePreferences } from "@/hooks/usePreferences";
import "./SettingsPage.scss";

export default function SettingsPage() {
  const { miniNavEnabled, setMiniNavEnabled } = usePreferences();

  return (
    <div className="settings-page">
      <h1 className="settings-page__title">Ajustes</h1>

      <section className="settings-page__section">
        <p className="settings-page__section-title">Navegación</p>

        <div className="settings-page__row">
          <div className="settings-page__row-info">
            <p className="settings-page__row-label">Barra compacta al desplazar</p>
            <p className="settings-page__row-desc">
              Sustituye la barra de navegación principal por una versión compacta al hacer scroll.
            </p>
          </div>
          <button
            className={`settings-page__toggle${miniNavEnabled ? " settings-page__toggle--on" : ""}`}
            role="switch"
            aria-checked={miniNavEnabled}
            aria-label="Barra compacta al desplazar"
            onClick={() => setMiniNavEnabled(!miniNavEnabled)}
          />
        </div>
      </section>
    </div>
  );
}
