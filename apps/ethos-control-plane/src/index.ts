import { createControlPlane } from "./server";

const port = Number(process.env.PORT ?? 8788);
createControlPlane().listen(port, "0.0.0.0", () => {
  process.stdout.write(`ETHOS control plane listening on ${port}\n`);
});
