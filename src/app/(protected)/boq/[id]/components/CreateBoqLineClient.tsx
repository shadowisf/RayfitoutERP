import AddItemButton from "./_AddItemButton";

export default function CreateBoqLineClient({
  boqHeaderID,
}: {
  boqHeaderID: string;
}) {
  const no_item_img = "/images/no-items.svg";

  return (
    <div className="no-items-container">
      <img src={no_item_img} alt="no items image" />

      <br />
      <br />
      <br />

      <h2>NO ITEMS ADDED</h2>

      <br />

      <span>
        Begin by adding items or subcategories to start structuring your BOQ
      </span>

      <br />
      <br />
      <br />

      <AddItemButton full boqHeaderID={boqHeaderID}>
        ADD ITEM +
      </AddItemButton>
    </div>
  );
}
