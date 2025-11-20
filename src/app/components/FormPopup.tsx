type FormPopUpProps = {
  header: string;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  addButtonLabel: string;
};

export default function FormPopUp({
  header,
  setIsOpen,
  handleSubmit,
  addButtonLabel,
  children,
}: FormPopUpProps) {
  const cross_icon = "/icons/cross.svg";

  return (
    <div className="form-outer-container">
      <div className="form-inner-container">
        <div className="form-header" style={{ marginBottom: "40px" }}>
          <h2>{header}</h2>

          <img
            src={cross_icon}
            alt="cross"
            style={{ cursor: "pointer" }}
            onClick={() => setIsOpen(false)}
          />
        </div>

        <form onSubmit={handleSubmit}>
          {children}

          <div className="button-container">
            <button className="save-draft-button">SAVE DRAFT</button>

            <button className="add-project-button" type="submit">
              {addButtonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
