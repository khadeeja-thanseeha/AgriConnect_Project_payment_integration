import React, { useState, useEffect } from "react";
import axios from "axios";
import "./MyOrders.css";

const MyOrders = () => {
  const [activeTab, setActiveTab] = useState("current");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      // Replace with your actual backend endpoint
      const res = await axios.get("http://localhost:5000/api/orders/my-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching orders", err);
      setLoading(false);
    }
  };

  // Filter logic based on order status
  const currentOrders = orders.filter(o => o.status === "Pending" || o.status === "Shipped");
  const pastOrders = orders.filter(o => o.status === "Delivered" || o.status === "Cancelled");

  const displayOrders = activeTab === "current" ? currentOrders : pastOrders;

  if (loading) return <div className="loader">Loading your orders...</div>;

  return (
    <div className="orders-container">
      <h1 className="orders-title">Your Orders</h1>

      {/* TABS */}
      <div className="orders-tabs">
        <button 
          className={activeTab === "current" ? "tab active" : "tab"} 
          onClick={() => setActiveTab("current")}
        >
          Current Orders ({currentOrders.length})
        </button>
        <button 
          className={activeTab === "past" ? "tab active" : "tab"} 
          onClick={() => setActiveTab("past")}
        >
          Past Orders ({pastOrders.length})
        </button>
      </div>

      {/* ORDERS LIST */}
      <div className="orders-list">
        {displayOrders.length > 0 ? (
          displayOrders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div>
                  <p className="label">ORDER PLACED</p>
                  <p className="value">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="label">TOTAL</p>
                  <p className="value">₹{order.totalAmount}</p>
                </div>
                <div>
                  <p className="label">ORDER #</p>
                  <p className="value">{order._id.substring(0, 8).toUpperCase()}</p>
                </div>
                <div className="order-status-badge" data-status={order.status}>
                  {order.status}
                </div>
              </div>

              <div className="order-body">
                {order.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <img src={item.image || "https://via.placeholder.com/80"} alt={item.name} />
                    <div className="item-details">
                      <h4>{item.name}</h4>
                      <p>Quantity: {item.quantity}</p>
                      <p className="item-price">₹{item.price}</p>
                    </div>
                    {order.status === "Delivered" && (
                      <button className="buy-again-btn">Buy it again</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="no-orders">
            <i className="fas fa-box-open"></i>
            <p>No {activeTab} orders found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;