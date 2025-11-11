const hre = require("hardhat");

async function main() {
  // Get contract address from command line or use default
  const contractAddress = process.argv[2] || process.env.CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.log("❌ Please provide contract address as argument or set CONTRACT_ADDRESS in .env");
    console.log("Usage: npx hardhat run scripts/test-donate.js --network localhost <CONTRACT_ADDRESS>");
    return;
  }

  console.log("🧪 Testing donation to CharityFund...\n");
  console.log("Contract address:", contractAddress, "\n");

  const [donor1, donor2, donor3] = await hre.ethers.getSigners();
  const CharityFund = await hre.ethers.getContractFactory("CharityFund");
  const charityFund = CharityFund.attach(contractAddress);

  // Get initial state
  console.log("📊 Initial State:");
  console.log("   Contract balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(contractAddress)), "ETH");
  console.log("   Safe address:", await charityFund.safe());
  console.log("   Threshold:", hre.ethers.formatEther(await charityFund.THRESHOLD()), "ETH\n");

  // Test 1: Small donation (should not trigger auto-transfer)
  console.log("📝 Test 1: Donate 1 ETH (below threshold)");
  const tx1 = await donor1.sendTransaction({
    to: contractAddress,
    value: hre.ethers.parseEther("1.0"),
  });
  await tx1.wait();
  console.log("   ✅ Transaction:", tx1.hash);
  console.log("   Contract balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(contractAddress)), "ETH\n");

  // Test 2: Another small donation
  console.log("📝 Test 2: Donate 2 ETH (still below threshold)");
  const tx2 = await donor2.sendTransaction({
    to: contractAddress,
    value: hre.ethers.parseEther("2.0"),
  });
  await tx2.wait();
  console.log("   ✅ Transaction:", tx2.hash);
  console.log("   Contract balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(contractAddress)), "ETH\n");

  // Test 3: Large donation (should trigger auto-transfer)
  console.log("📝 Test 3: Donate 3 ETH (should trigger auto-transfer at >= 5 ETH)");
  const safeAddress = await charityFund.safe();
  const safeBalanceBefore = await hre.ethers.provider.getBalance(safeAddress);
  
  const tx3 = await donor3.sendTransaction({
    to: contractAddress,
    value: hre.ethers.parseEther("3.0"),
  });
  await tx3.wait();
  
  const safeBalanceAfter = await hre.ethers.provider.getBalance(safeAddress);
  
  console.log("   ✅ Transaction:", tx3.hash);
  console.log("   Contract balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(contractAddress)), "ETH");
  console.log("   Safe balance before:", hre.ethers.formatEther(safeBalanceBefore), "ETH");
  console.log("   Safe balance after:", hre.ethers.formatEther(safeBalanceAfter), "ETH");
  console.log("   Transferred:", hre.ethers.formatEther(safeBalanceAfter - safeBalanceBefore), "ETH\n");

  // Query events
  console.log("📜 Querying Events:");
  const donationFilter = charityFund.filters.DonationReceived();
  const donations = await charityFund.queryFilter(donationFilter);
  
  console.log(`\n   Found ${donations.length} donations:`);
  donations.forEach((event, index) => {
    console.log(`   ${index + 1}. From: ${event.args.donor}`);
    console.log(`      Amount: ${hre.ethers.formatEther(event.args.amount)} ETH`);
    console.log(`      Balance after: ${hre.ethers.formatEther(event.args.balance)} ETH`);
  });

  const transferFilter = charityFund.filters.AutoTransfer();
  const transfers = await charityFund.queryFilter(transferFilter);
  
  console.log(`\n   Found ${transfers.length} auto-transfers:`);
  transfers.forEach((event, index) => {
    console.log(`   ${index + 1}. Amount: ${hre.ethers.formatEther(event.args.amount)} ETH`);
    console.log(`      To: ${event.args.to}`);
  });

  console.log("\n✨ Testing completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
