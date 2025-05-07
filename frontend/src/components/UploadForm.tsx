import { useState } from 'react';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const UploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${backendUrl}/upload/image`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setPreviewUrl(data.url);
  };

  return (
    <section>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      {previewUrl && (
        <figure>
          <img src={previewUrl} alt="Uploaded preview" style={{ width: 200 }} />
        </figure>
      )}
    </section>
  );
};

export default UploadForm;