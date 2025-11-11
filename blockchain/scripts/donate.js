const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const contractAddress = process.argv[2] || process.env.CONTRACT_ADDRESS;
  const amountWei = process.argv[3] || process.env.DONATION_AMOUNT_WEI || "100000"; // default 10k in wei

  if (!contractAddress) {
    console.log("❌ Usage: npx hardhat run scripts/donate.js --network sepolia <CONTRACT_ADDRESS> <AMOUNT_WEI>");
    console.log("   Or set CONTRACT_ADDRESS and DONATION_AMOUNT_WEI in .env");
    process.exit(1);
  }

  const [sender] = await hre.ethers.getSigners();

  console.log("🎁 Donating to CharityFund");
  console.log("   From:", sender.address);
  console.log("   To (Contract):", contractAddress);
  console.log("   Amount (wei):", amountWei);

  const tx = await sender.sendTransaction({
    to: contractAddress,
    value: BigInt(amountWei),
  });
  console.log("⏳ Tx:", tx.hash);
  await tx.wait();
  console.log("✅ Donation confirmed");

  const balance = await hre.ethers.provider.getBalance(contractAddress);
  console.log("💰 Contract balance now:", hre.ethers.formatEther(balance), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


