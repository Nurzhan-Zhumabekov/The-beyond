type Props = {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
};

export default function LoadingButton({ loading, children, loadingText = "Please wait…", disabled, type = "button", className = "generate full" }: Props) {
  return (
    <button type={type} className={className} disabled={disabled || loading}>
      {loading ? loadingText : children}
    </button>
  );
}
