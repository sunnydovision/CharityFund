const hre = require("hardhat");
require("dotenv").config();

async function main() {
  // Recipient address từ env hoặc default
  const recipientAddress = process.env.METAMASK_ADDRESS || "0x5eF71308980d1235291F33CfA0420b5DB251E391";
  
  // Số ETH muốn gửi từ env hoặc default
  const amountETH = process.env.SEND_AMOUNT || "5";
  
  // Lấy signer (Account #0 - có 10,000 ETH)
  const [sender] = await hre.ethers.getSigners();
  
  console.log(`📤 Sending ${amountETH} ETH from ${sender.address}`);
  console.log(`📥 To: ${recipientAddress}`);
  
  // Gửi ETH
  const tx = await sender.sendTransaction({
    to: recipientAddress,
    value: hre.ethers.parseEther(amountETH),
  });
  
  console.log(`⏳ Transaction hash: ${tx.hash}`);
  
  // Chờ transaction confirm
  const receipt = await tx.wait();
  
  console.log(`✅ Transaction confirmed!`);
  console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
  
  // Kiểm tra balance
  const balance = await hre.ethers.provider.getBalance(recipientAddress);
  console.log(`💰 New balance of ${recipientAddress}: ${hre.ethers.formatEther(balance)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
