import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";
import { JWKInterface } from "arweave/node/lib/wallet";

interface IInput {
    function: string;
}

export async function interactWrite(
    arweave: Arweave,
    wallet: JWKInterface,
    contractId: string,
    input: IInput,
): Promise<Transaction> {
    const interactTx = await arweave.createTransaction(
        { data: `Pianity ${input.function} ${new Date().toISOString()}` },
        wallet,
    );

    interactTx.addTag("App-Name", "SmartWeaveAction");
    interactTx.addTag("App-Version", "0.3.0");
    interactTx.addTag("Contract", contractId);
    interactTx.addTag("Input", JSON.stringify(input));

    await arweave.transactions.sign(interactTx, wallet);

    const response = await arweave.transactions.post(interactTx);

    if (response.status !== 200) {
        throw new Error("Unable to execute interactWrite");
    }

    return interactTx;
}
