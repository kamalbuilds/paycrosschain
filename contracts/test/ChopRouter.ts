require("dotenv").config();

import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { ExpenseSplitter, IERC20 } from "../typechain-types";

describe("ExpenseSplitter on Ethereum Mainnet Fork", function () {
  let expenseSplitter: ExpenseSplitter, usdc: IERC20;
  let impersonatedSigner: Signer;
  let destinationTokens: IERC20[] = [];
  let swapAmounts: bigint[] = [];
  let minOutAmounts: bigint[] = [];
  let accounts: Signer[],
    destinations: string[] = [];
  const totalAmount = ethers.parseUnits("1000", 6); // 1000 USDC

  before(async function () {
    // Fork Ethereum Mainnet
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.MAINNET_RPC_URL as string, // Replace with your Ethereum Mainnet RPC URL
            blockNumber: 17500000, // Optional: Set a specific block number for the fork
          },
        },
      ],
    });

    // Get the signers (accounts)
    accounts = await ethers.getSigners();

    // Use the Uniswap V2 Router address (Mainnet)
    const UniswapV2RouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router

    // Impersonate a USDC-rich account (for example, this one has a lot of USDC)
    const usdcWhale = "0x55fe002aeff02f77364de339a1292923a15844b8"; // A USDC whale address

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [usdcWhale],
    });

    impersonatedSigner = await ethers.provider.getSigner(usdcWhale);

    // Deploy ExpenseSplitter contract
    const ExpenseSplitter = await ethers.getContractFactory("ExpenseSplitter");
    expenseSplitter = await ExpenseSplitter.deploy(UniswapV2RouterAddress);
    await expenseSplitter.waitForDeployment();

    // USDC token on Ethereum Mainnet
    usdc = await ethers.getContractAt(
      "IERC20",
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    ); // USDC address

    // Select tokens that can be swapped from USDC on Uniswap V2
    const tokenAddresses = [
      "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
      "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
    ];

    for (let i = 0; i < tokenAddresses.length; i++) {
      const token = await ethers.getContractAt("IERC20", tokenAddresses[i]);
      destinationTokens.push(token);

      // Set the amount to swap for each destination
      const swapAmount = ethers.parseUnits((200).toString(), 6); // Swap 200 USDC each
      swapAmounts.push(swapAmount);

      // Set minimum output (for simplicity, 1 unit of each destination token)
      const decimals = await token.decimals();
      const minOutAmount = ethers.parseUnits("1", decimals);
      minOutAmounts.push(minOutAmount);

      // Set destination addresses (use random accounts)
      destinations.push(await accounts[i].getAddress());
    }

    // Fund the impersonated account with some ETH for gas
    await ethers.provider.send("hardhat_setBalance", [
      usdcWhale,
      "0x100000000000000000000",
    ]);
  });

  it("should perform swapAndDistribute from USDC", async function () {
    console.log("Approving USDC for ExpenseSplitter contract");
    // Approve the USDC for the contract
    await usdc
      .connect(impersonatedSigner)
      .approve(await expenseSplitter.getAddress(), totalAmount);
    console.log("USDC approved");

    // Define Uniswap swap paths for each destination token
    const uniswapPaths: string[][] = [];
    for (let i = 0; i < destinationTokens.length; i++) {
      uniswapPaths.push([
        await usdc.getAddress(),
        await destinationTokens[i].getAddress(),
      ]); // Path: [USDC, OUT]
    }

    // Create SwapParams array according to the ExpenseSplitter contract
    const swapParamsPromises = destinations.map(async (destination, i) => ({
      destination,
      destinationToken: await destinationTokens[i].getAddress(),
      swapAmount: swapAmounts[i],
      minOutAmount: minOutAmounts[i],
      uniswapPath: uniswapPaths[i],
    }));
    
    const swapParams = await Promise.all(swapParamsPromises);

    console.log("Executing swapAndDistribute");
    // Perform the swap and distribute using the impersonated account
    await expenseSplitter
      .connect(impersonatedSigner)
      .swapAndDistribute(await usdc.getAddress(), totalAmount, swapParams);

    // Verify balances of destination tokens for each destination
    for (let i = 0; i < destinations.length; i++) {
      const destinationBalance = await destinationTokens[i].balanceOf(
        destinations[i]
      );
      // We expect the balance to be greater than zero since minOutAmount is set to a small value
      expect(destinationBalance).to.be.gt(0);
      console.log(
        `Destination ${i + 1} received: ${ethers.formatUnits(
          destinationBalance,
          await destinationTokens[i].decimals()
        )} ${await destinationTokens[i].symbol()}`
      );
    }
  });
});
