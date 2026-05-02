type AuthToggleLinkProps = {
  text: string;
  linkText: string;
  onClick: () => void;
};

export default function AuthToggleLink({ text, linkText, onClick }: AuthToggleLinkProps) {
  return (
    <p className="auth__toggle">
      {text}{" "}
      <span
        className="auth__toggle-link"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClick();
        }}
      >
        {linkText}
      </span>
    </p>
  );
}
