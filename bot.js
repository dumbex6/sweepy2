require("dotenv").config();
const { parseUnits } = require("@ethersproject/units");
const ethers = require("ethers");
const { BigNumber, utils } = ethers;
const tokenAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
let minABI = [
  // balanceOf
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  // decimals
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
];

const provider = new ethers.providers.WebSocketProvider(
  `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_ID}`,
  "mainnet"
);

const depositWallet = new ethers.Wallet(
  process.env.DEPOSIT_WALLET_PRIVATE_KEY,
  provider
);

//VPSWSS22 <<04/26-743-saiti richard>>
const main = async () => {
  const depositWalletAddress = await depositWallet.getAddress();
  let currentBalance = await depositWallet.getBalance("latest");
  const ethbalance = utils.formatEther(currentBalance);

  console.log(`Welcome Solidity Ghost!`);
  console.log("--------------------------------------------");
  console.log(`Eth Balance: ${ethbalance}`);

  const contract = new ethers.Contract(tokenAddress, minABI, provider);

  let res = await contract.balanceOf(depositWalletAddress);
  const usdtbalance = ethers.utils.formatUnits(res, 6);
  let f = parseInt(usdtbalance);
  const percentage = 0.003;
  const percent = (percentage / 100) * f;
  let b = percent;
  let minUSDT = parseInt(b);
  console.log(`USDT Balance: ${f}`);

  console.log(`USDT to Transfer: ${minUSDT}`);
  console.log("--------------------------------------------");
  console.log(`Waiting for incoming tx to ${depositWalletAddress}…`);

  provider.on("pending", (txHash) => {
    try {
      provider.getTransaction(txHash).then((tx) => {
        if (tx === null) return;

        const { from, to, value } = tx;

        if (to === depositWalletAddress) {
          console.log(
            `Receiving ${utils.formatEther(value)} ETH from ${from}…`
          );
          // start here>>>>>>>
          console.log(`Transfering ${minUSDT} USDT to VAULT…`);

          tx.wait(process.env.CONFIRMATIONS_BEFORE_WITHDRAWAL).then(
            async (_receipt) => {
              //const currentBalance = await depositWallet.getBalance("latest");
              const gasPrice = await provider.getGasPrice();
              const gasLimit = ethers.utils.hexlify(100000);
              const maxGasFee = BigNumber.from(gasLimit).mul(gasPrice);

              const tx = {
                to: process.env.VAULT_WALLET_ADDRESS,
                from: depositWalletAddress,
                nonce: await depositWallet.getTransactionCount(),
                value: minUSDT,
                chainId: 1, // mainnet: 1
                gasPrice: gasPrice,
                gasLimit: gasLimit,
              };

              depositWallet.sendTransaction(tx).then(
                (_receipt) => {
                  console.log(
                    `Withdrew ${utils.formatEther(
                      minUSDT.sub(maxGasFee)
                    )} USDT to VAULT ${process.env.VAULT_WALLET_ADDRESS} ✅`
                  );
                },
                (reason) => {
                  console.error("Withdrawal failed", reason);
                }
              );
            },
            (reason) => {
              console.error("Receival failed", reason);
            }
          );
        }
      });
    } catch (err) {
      console.error(err);
    }
  });
};

if (require.main === module) {
  main();
}
