import React from 'react';
import './Inventory.css';

const Inventory = ({ inventory, onClose }) => {
  return (
    <div className="inventory-overlay">
      <div className="inventory-container">
        <div className="inventory-header">
          <h3>Inventário</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="inventory-grid">
          {Array.from({ length: 8 }, (_, index) => {
            const item = inventory[index];
            return (
              <div key={index} className={`inventory-slot ${item ? 'filled' : ''}`}>
                {item && (
                  <>
                    <span className="item-emoji">{item.data.emoji}</span>
                    {item.count > 1 && (
                      <span className="item-count">{item.count}</span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Inventory;
