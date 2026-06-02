import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUsernameAvailability } from "./useUsernameAvailability";
import { checkUsernameAvailable } from "@/services/firebase/firebaseUsernames";

vi.mock("@/services/firebase/firebaseUsernames", () => {
  const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
  return {
    normalizeUsername: (raw: string) => raw.trim().toLowerCase().replace(/^@/, ""),
    isValidUsername: (u: string) => USERNAME_REGEX.test(u),
    checkUsernameAvailable: vi.fn(),
  };
});

const mockCheck = vi.mocked(checkUsernameAvailable);

describe("useUsernameAvailability", () => {
  beforeEach(() => {
    mockCheck.mockReset();
  });

  it("returns 'idle' for an invalid (too short) username and never checks", () => {
    const { result } = renderHook(() => useUsernameAvailability("ab"));
    expect(result.current).toBe("idle");
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it("returns 'available' when the name is free", async () => {
    mockCheck.mockResolvedValue(true);
    const { result } = renderHook(() => useUsernameAvailability("guillermo"));
    expect(result.current).toBe("checking");
    await waitFor(() => expect(result.current).toBe("available"));
    expect(mockCheck).toHaveBeenCalledWith("guillermo", undefined);
  });

  it("returns 'taken' when the name is reserved", async () => {
    mockCheck.mockResolvedValue(false);
    const { result } = renderHook(() => useUsernameAvailability("taken_name"));
    await waitFor(() => expect(result.current).toBe("taken"));
  });

  it("passes the uid through to checkUsernameAvailable", async () => {
    mockCheck.mockResolvedValue(true);
    renderHook(() => useUsernameAvailability("mi_user", "uid-123"));
    await waitFor(() => expect(mockCheck).toHaveBeenCalledWith("mi_user", "uid-123"));
  });
});
