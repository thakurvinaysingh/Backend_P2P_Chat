const axios = require('axios');

const CHAT_API_URL = "https://P2P.upbpay.com/api/P2PChat/InsertChatProcess";

/**
 * Save chat/message to .NET API
 */
const saveChatProcess = async ({ txnId, buyerUPBAddress, sellerUPBAddress, status, message, msgImg, upbAddress }) => {
    try {
        const payload = {
            txnId,
            buyerUPBAddress,
            sellerUPBAddress,
            status,          // E.g. "send_message", "bank_details", etc.
            message,         // The text message
            msgImg,          // Optional (null or base64 or URL)
            upbAddress       // Sender's UPB address
        };

        const res = await axios.post(CHAT_API_URL, payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'UpbpAddress': 'UPBP7014C414CE7A8427ED2716C2AB89955729'
                },
                auth: {
                    username: 'UPBA_register',
                    password: 'UPBA_register'
                }
     } );
        console.log("📥 Chat logged:", res.data.message);
    } catch (err) {
        console.error("❌ Failed to log chat:", err.response?.data || err.message);
    }
};

module.exports = { saveChatProcess };
