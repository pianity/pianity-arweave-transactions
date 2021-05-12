import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";
import { JWKInterface } from "arweave/node/lib/wallet";
import {
    execute,
    ContractInteraction,
    ContractInteractionResult,
} from "smartweave/lib/contract-step";
import { unpackTags } from "smartweave/lib/utils";
import { loadContract } from "smartweave/lib/contract-load";
import { readContract } from "smartweave/lib/contract-read";
import { InteractionTx } from "smartweave/lib/interaction-tx";

const PST = "PTY";

interface IInput {
    function: string;
}

interface ICreateTransactionOptions {
    input?: IInput;
    winstonQty?: string;
    publicKey?: JWKInterface;
    target?: string;
    contractId?: string;
    tags?: { name: string; value: string }[];
    data?: Uint8Array;
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

export async function createTransaction(
    arweave: Arweave,
    {
        input,
        winstonQty = "0",
        publicKey,
        target = "",
        contractId,
        tags,
        data,
    }: ICreateTransactionOptions,
): Promise<Transaction> {
    let interactTx = await arweave.createTransaction(
        { data: data || Math.random().toString().slice(4), quantity: winstonQty, target },
        publicKey,
    );

    interactTx.addTag("Exchange", "Pianity");
    if (input && contractId) {
        interactTx.addTag("Type", input.function);
        interactTx.addTag("App-Name", "SmartWeaveAction");
        interactTx.addTag("App-Version", "0.3.0");
        interactTx.addTag("Contract", contractId);
        interactTx.addTag("Input", JSON.stringify(input));
    }
    interactTx.addTag("Unix-Time", `${Date.now()}`);

    if (tags) {
        tags.forEach(({ name, value }) => interactTx.addTag(name, value));
    }

    return interactTx;
}

export async function interactWriteDryRun(
    arweave: Arweave,
    tx: Transaction,
    contractId: string,
    input: IInput,
    fromAddress: string,
): Promise<ContractInteractionResult> {
    const contractInfo = await loadContract(arweave, contractId);
    const latestState = await readContract(arweave, contractId);

    const interaction: ContractInteraction = {
        input,
        caller: fromAddress,
    };

    const { height, current } = await arweave.network.getInfo();

    const ts = unpackTags(tx);

    const dummyActiveTx: InteractionTx = {
        id: tx.id,
        owner: {
            address: fromAddress,
        },
        recipient: tx.target,
        tags: ts,
        fee: {
            winston: tx.reward,
        },
        quantity: {
            winston: tx.quantity,
        },
        block: {
            height,
            id: current,
            timestamp: Date.now(),
        },
    };

    contractInfo.swGlobal._activeTx = dummyActiveTx;

    return execute(contractInfo.handler, interaction, latestState);
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
