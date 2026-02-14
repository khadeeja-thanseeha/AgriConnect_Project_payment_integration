import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  MDBIcon // Add this here
} from 'mdb-react-ui-kit';
import { ethers } from "ethers"; // Essential for MetaMask
import { useCart } from "../../../context/CartContext"; // Import Cart Context
import "./Checkout.css";

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  // Extract both INR and ETH totals passed from previous page
  const { product, qty, totalAmountETH, totalAmountINR, cartItems } = location.state || {};
  const [processing, setProcessing] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  // If the user lands here without data, redirect to shop
  useEffect(() => {
    if (!product && !cartItems) {
      navigate("/shop");
    }
    checkWalletConnection();
  }, [product, cartItems, navigate]);

  // Check if MetaMask is connected
  const checkWalletConnection = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) setWalletAddress(accounts[0]);
    }
  };

  const handleBlockchainPayment = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to proceed with the transaction.");
      return null;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // TRIGGER METAMASK POPUP
      const tx = await signer.sendTransaction({
        to: "0xYourEscrowContractAddressHere", // We will replace this with your Escrow Contract later
        value: ethers.parseEther(totalAmountETH.toString()),
      });

      console.log("Transaction Sent:", tx.hash);
      return tx.hash; // Return the hash to save in MongoDB
    } catch (err) {
      console.error("Blockchain Error:", err);
      alert("Payment failed or cancelled in MetaMask.");
      return null;
    }
  };

  const handleConfirmOrder = async () => {
    setProcessing(true);
    
    // 1. Trigger MetaMask first
    const txHash = await handleBlockchainPayment();
    
    if (!txHash) {
      setProcessing(false);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const ordersToPlace = cartItems 
        ? cartItems.map(item => ({
            productId: item._id,
            farmerId: item.farmerId._id || item.farmerId,
            quantity: item.qty,
            totalPriceINR: (item.priceInINR * item.qty),
            transactionHash: txHash, // Store the proof of payment
            status: "Paid"
          }))
        : [{
            productId: product._id,
            farmerId: product.farmerId._id || product.farmerId,
            quantity: qty,
            totalPriceINR: totalAmountINR,
            transactionHash: txHash,
            status: "Paid"
          }];

      for (const order of ordersToPlace) {
        await axios.post("http://localhost:5000/api/orders/place", order, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (cartItems) clearCart(); 
      alert("Order Placed Successfully on Blockchain!");
      navigate("/my-orders");

    } catch (err) {
      alert("Order recording failed. Please contact support with TxHash: " + txHash);
    } finally {
      setProcessing(false);
    }
  };

  if (!product && !cartItems) return null;

  return (
    <div className="checkout-page">
      <div className="checkout-card">
        <h2 className="checkout-title">Blockchain Checkout</h2>
        
        <div className="checkout-items-preview">
          {cartItems ? (
            cartItems.map(item => (
              <div key={item._id} className="checkout-row">
                <img src={`http://localhost:5000/${item.image?.replace(/\\/g, "/")}`} alt={item.cropName} />
                <span>{item.cropName} (x{item.qty}kg)</span>
                <strong>₹{item.priceInINR * item.qty}</strong>
              </div>
            ))
          ) : (
            <div className="checkout-row">
              <img src={`http://localhost:5000/${product.image?.replace(/\\/g, "/")}`} alt={product.cropName} />
              <span>{product.cropName} (x{qty}kg)</span>
              <strong>₹{totalAmountINR}</strong>
            </div>
          )}
        </div>

        <div className="checkout-billing">
          <div className="billing-item">
            <span>Stable Subtotal (INR):</span>
            <span>₹{totalAmountINR}</span>
          </div>
          <div className="billing-item grand-total">
            <span>Payable Amount (ETH):</span>
            <span><i className="fab fa-ethereum"></i> {totalAmountETH} ETH</span>
          </div>
        </div>

        <div className="wallet-status-box">
          {walletAddress ? (
            <p className="text-success small">
              <MDBIcon fas icon="check-circle" /> Connected: {walletAddress.substring(0,6)}...{walletAddress.substring(38)}
            </p>
          ) : (
            <p className="text-danger small">No Wallet Detected</p>
          )}
        </div>

        <button className="confirm-btn" onClick={handleConfirmOrder} disabled={processing}>
          {processing ? "Processing Blockchain Transaction..." : `Pay ${totalAmountETH} ETH via MetaMask`}
        </button>
        
        <button className="cancel-text" onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </div>
  );
};

export default Checkout;