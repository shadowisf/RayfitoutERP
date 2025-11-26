import Button from "./Button";

type FormPopUpProps = {
  header: string;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  addButtonLabel: string;
  style?: React.CSSProperties;
};

export default function FormPopUp({
  header,
  setIsOpen,
  handleSubmit,
  addButtonLabel,
  children,
  style,
}: FormPopUpProps) {
  const cross_icon = "/icons/cross.svg";

  return (
    <div className="form-outer-container">
      <div className="form-inner-container" style={style}>
        <div className="form-header">
          <h2>{header}</h2>

          <img
            src={cross_icon}
            alt="cross"
            style={{ cursor: "pointer" }}
            onClick={() => setIsOpen(false)}
          />
        </div>

        <br />
        <br />

        <form onSubmit={handleSubmit}>
          {children}

          <br />
          <br />
          <br />

          <div className="button-container">
            <Button
              componentType={"button"}
              bgColor={"black"}
              borderColor={"black"}
              textColor={"white"}
              type="submit"
            >
              {addButtonLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
