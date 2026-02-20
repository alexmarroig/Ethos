import { createEthosBackend } from "./server";

const port = Number(process.env.PORT ?? 3000);

const server = createEthosBackend();
server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`ETHOS backend listening on ${port}\n`);
});
