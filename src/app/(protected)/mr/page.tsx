export default async function MR() {
  const mrs = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
    cache: "no-store",
  }).then((res) => res.json());

  return (
    <div className="dashboard">
      <h2>MATERIAL REQUESTS</h2>
      <br />

      <div className="widget-grid material-requests">
        {mrs.map((mr: any) => {
          return (
            <div className="widget" key={mr.id}>
              <h3>{mr.id}</h3>
              <p>{mr.requested_by}</p>
              <p>{mr.needed_by}</p>
              <p>{mr.purpose}</p>
              <p>{mr.reason}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
