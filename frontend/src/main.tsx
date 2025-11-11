import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize Safe SDK ngay khi app start - QUAN TRỌNG để Safe detect
// Safe Wallet sẽ kiểm tra xem app có khởi tạo SDK hay không
console.log('🚀 Starting Safe SDK initialization...');
console.log('Is in iframe?', typeof window !== 'undefined' ? window.self !== window.top : 'N/A');

// Khởi tạo SDK ngay lập tức - QUAN TRỌNG: Safe Wallet sẽ kiểm tra khi add app
// Safe Wallet có thể gửi message để kiểm tra, nên cần SDK sẵn sàng
let safeSDKInstance: any = null;

import('@safe-global/safe-apps-sdk')
  .then((module) => {
    console.log('📦 Safe SDK module loaded');
    const SafeAppsSDK = module.default || module;
    console.log('SafeAppsSDK type:', typeof SafeAppsSDK);
    
    try {
      const sdk = new SafeAppsSDK();
      safeSDKInstance = sdk;
      console.log('✅ Safe Apps SDK initialized successfully!', sdk);
      
      // Store globally để Safe có thể detect
      if (typeof window !== 'undefined') {
        (window as any).__SAFE_APP_SDK__ = sdk;
        (window as any).safeSDK = sdk;
      }
      
      // QUAN TRỌNG: Listen cho messages từ Safe Wallet parent
      // Safe Wallet có thể gửi message để kiểm tra app có hỗ trợ không
      if (typeof window !== 'undefined' && window.self !== window.top) {
        window.addEventListener('message', (event) => {
          // Chỉ xử lý messages từ Safe Wallet
          if (event.origin.includes('safe.global') || event.origin.includes('app.safe.global')) {
            console.log('📨 Received message from Safe Wallet:', event.data);
            
            // Nếu Safe Wallet hỏi về SDK, trả lời
            if (event.data && typeof event.data === 'object') {
              if (event.data.type === 'safe-apps-sdk' || event.data.method === 'getInfo') {
                console.log('✅ Responding to Safe Wallet SDK check');
                // SDK sẽ tự động xử lý, nhưng log để biết
              }
            }
          }
        });
      }
      
      // QUAN TRỌNG: Thử gọi getInfo() để "activate" SDK
      // Safe Wallet có thể cần thấy app có thể giao tiếp được
      if (sdk && sdk.safe) {
        // Thử gọi getInfo() - sẽ fail nếu không trong Safe Wallet, nhưng Safe sẽ biết app hỗ trợ
        sdk.safe.getInfo()
          .then((info) => {
            console.log('✅ Safe Wallet detected! Safe info:', info);
          })
          .catch((e) => {
            // Đây là OK - app không chạy trong Safe Wallet
            // Nhưng Safe Wallet sẽ thấy app đã khởi tạo SDK và có thể gọi getInfo()
            console.log('ℹ️ Not in Safe Wallet (this is OK when adding app):', e?.message || 'Not in Safe');
          });
      }
    } catch (e) {
      console.error('❌ Failed to instantiate Safe SDK:', e);
    }
  })
  .catch((e) => {
    console.error('❌ Failed to import Safe SDK:', e);
    console.error('Error details:', e?.message, e?.stack);
  });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
