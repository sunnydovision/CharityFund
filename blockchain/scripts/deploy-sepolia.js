const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying CharityFund to Sepolia testnet...\n");

  // Check if GNOSIS_SAFE_ADDRESS is set
  const gnosisSafeAddress = process.env.GNOSIS_SAFE_ADDRESS;
  if (!gnosisSafeAddress) {
    throw new Error("❌ GNOSIS_SAFE_ADDRESS not set in .env file");
  }

  const [deployer] = await hre.ethers.getSigners();

  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Gnosis Safe address:", gnosisSafeAddress, "\n");

  // Deploy CharityFund
  console.log("📝 Deploying CharityFund...");
  const CharityFund = await hre.ethers.getContractFactory("CharityFund");
  const charityFund = await CharityFund.deploy(gnosisSafeAddress);
  await charityFund.waitForDeployment();
  const charityFundAddress = await charityFund.getAddress();

  console.log("✅ CharityFund deployed to:", charityFundAddress);
  console.log("   Safe address:", await charityFund.safe());
  console.log("   Threshold:", hre.ethers.formatEther(await charityFund.THRESHOLD()), "ETH\n");

  // Wait for block confirmations
  console.log("⏳ Waiting for block confirmations...");
  await charityFund.deploymentTransaction().wait(5);
  console.log("✅ Confirmed!\n");

  // Verify contract on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: charityFundAddress,
        constructorArguments: [gnosisSafeAddress],
      });
      console.log("✅ Contract verified!\n");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message, "\n");
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    charityFund: charityFundAddress,
    gnosisSafe: gnosisSafeAddress,
    threshold: "5",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    etherscanUrl: `https://sepolia.etherscan.io/address/${charityFundAddress}`,
  };

  console.log("📄 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✨ Deployment completed!\n");

  // Instructions
  console.log("📚 Next Steps:");
  console.log("1. Update frontend .env with:");
  console.log(`   VITE_CONTRACT_ADDRESS=${charityFundAddress}`);
  console.log(`   VITE_SAFE_ADDRESS=${gnosisSafeAddress}`);
  console.log(`   VITE_NETWORK=sepolia`);
  console.log(`   VITE_RPC_URL=${process.env.SEPOLIA_RPC_URL}`);
  console.log("\n2. View on Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${charityFundAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
