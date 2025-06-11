import { io } from "socket.io-client";


const url = import.meta.env.VITE_SOCKETIO_API_BASE;
const socket = io(url); // Gerekirse prod'da değiştir

export default socket; 