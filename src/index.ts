import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";
import { JWKInterface } from "arweave/node/lib/wallet";

const PST = "PTY";

interface IInput {
    function: string;
}

type TransactionSigner = (transaction: Transaction) => Promise<Transaction>;

export function payWithEuros(
    contractOwnerAddr: string,
    target: string,
    tokenId: string,
    price: number,
) {
    return {
        function: "transferBatch",
        froms: [contractOwnerAddr, ""],
        tokenIds: [PST, tokenId],
        targets: [target, target],
        qtys: [price, undefined],
        nos: [undefined, 1],
        prices: [undefined, price],
    };
}

export async function interactWrite(
    arweave: Arweave,
    signer: TransactionSigner,
    contractId: string,
    input: IInput,
): Promise<Transaction> {
    let interactTx = await arweave.createTransaction({ data: "" });

    interactTx.addTag("Exchange", "Pianity");
    interactTx.addTag("Type", input.function);
    interactTx.addTag("App-Name", "SmartWeaveAction");
    interactTx.addTag("App-Version", "0.3.0");
    interactTx.addTag("Unix-Time", `${Date.now()}`);
    interactTx.addTag("Contract", contractId);
    interactTx.addTag("Input", JSON.stringify(input));

    interactTx = await signer(interactTx);

    const response = await arweave.transactions.post(interactTx);

    if (response.status !== 200) {
        throw new Error("Unable to execute interactWrite");
    }

    return interactTx;
}

export function createJWKSigner(arweave: Arweave, wallet: JWKInterface): TransactionSigner {
    return (transaction: Transaction) =>
        arweave.transactions.sign(transaction, wallet).then(() => transaction);
}
