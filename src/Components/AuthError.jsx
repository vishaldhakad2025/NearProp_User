import React from "react";
import { useNavigate } from "react-router-dom";

const LoginRequiredDialog = ({ open, onClose }) => {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <>
      <style>
        {`
        .login-dialog-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .login-dialog {
          background: #ffffff;
          width: 90%;
          max-width: 400px;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          animation: scaleIn 0.25s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        }

        .login-dialog h2 {
          margin-bottom: 10px;
          color: #222;
          font-size: 22px;
        }

        .login-dialog p {
          color: #555;
          font-size: 15px;
          margin-bottom: 20px;
        }

        .login-dialog-actions {
          display: flex;
          gap: 12px;
        }

        .btn-cancel {
          flex: 1;
          color: #333;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #ccc;
          background: #fff;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-login {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: none;
          background: #03718a;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-login:hover {
          background: #025d70;
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        `}
      </style>

      <div className="login-dialog-backdrop">
        <div className="login-dialog">
          <h2>Login Required</h2>
          <p>You need to login to continue.</p>

          <div className="login-dialog-actions">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>

            <button
              className="btn-login"
              onClick={() => navigate("/login")}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginRequiredDialog;
