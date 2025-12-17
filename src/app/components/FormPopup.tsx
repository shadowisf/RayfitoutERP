import Button from "./Button";

type FormPopUpProps = {
  header: string | React.ReactNode;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubmit?: (e: React.FormEvent) => void;
  children: React.ReactNode;
  addButtonLabel?: string;
  style?: React.CSSProperties;
  secondButton?: React.ReactNode;
};

export default function FormPopUp({
  header,
  setIsOpen,
  handleSubmit,
  addButtonLabel,
  children,
  style,
  secondButton,
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

        {handleSubmit ? (
          <form onSubmit={handleSubmit}>
            {children}

            {addButtonLabel && (
              <>
                <br />
                <br />
                <br />

                <div className="button-container">
                  {secondButton}

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
              </>
            )}
          </form>
        ) : (
          <div>
            {children}

            {addButtonLabel && (
              <>
                <br />
                <br />
                <br />

                <div className="button-container">
                  {secondButton}

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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
