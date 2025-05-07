import React from 'react';

interface StoreInfoFormProps {
  storeName: string;
  onStoreNameChange: (name: string) => void;
  isSubmitting: boolean;
}

const StoreInfoForm: React.FC<StoreInfoFormProps> = ({
  storeName,
  onStoreNameChange,
  isSubmitting,
}) => {
  return (
    <section className="store-info-section">
      <h2>Store Information</h2>
      <fieldset className="form-group">
        <label htmlFor="storeName">Store Name</label>
        <input
          type="text"
          id="storeName"
          value={storeName}
          onChange={(e) => onStoreNameChange(e.target.value)}
          placeholder="Enter your store name"
          required
          disabled={isSubmitting}
        />
      </fieldset>
    </section>
  );
};

export default StoreInfoForm;