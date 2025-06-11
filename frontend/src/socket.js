import { io } from "socket.io-client";


const url = import.meta.env.VITE_SOCKETIO_API_BASE;
const socket = io("https://homebooking-kccp.onrender.com"); // Gerekirse prod'da değiştir

export default socket; 