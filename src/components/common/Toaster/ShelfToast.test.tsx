import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShelfToast from "./ShelfToast.tsx";

const { dismissMock } = vi.hoisted(() => ({
  dismissMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { dismiss: dismissMock },
}));

describe("ShelfToast", () => {
  beforeEach(() => { dismissMock.mockClear(); });

  it("renders message and title", () => {
    render(
      <ShelfToast
        cover={null}
        title="El Nombre del Viento"
        message="Has añadido a Quiero leer"
        toastId="t1"
      />
    );
    expect(screen.getByText("Has añadido a Quiero leer")).toBeInTheDocument();
    expect(screen.getByText("El Nombre del Viento")).toBeInTheDocument();
  });

  it("renders cover image when provided", () => {
    const { container } = render(
      <ShelfToast
        cover="https://example.com/cover.jpg"
        title="X"
        message="m"
        toastId="t1"
      />
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("renders placeholder when cover is null", () => {
    const { container } = render(<ShelfToast cover={null} title="X" message="m" toastId="t1" />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("calls onAction and dismisses when action button clicked", () => {
    const onAction = vi.fn();
    render(
      <ShelfToast
        cover={null}
        title="X"
        message="m"
        actionLabel="Deshacer"
        onAction={onAction}
        toastId="t1"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(dismissMock).toHaveBeenCalledWith("t1");
  });

  it("does not render action button when actionLabel is missing", () => {
    render(<ShelfToast cover={null} title="X" message="m" toastId="t1" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
