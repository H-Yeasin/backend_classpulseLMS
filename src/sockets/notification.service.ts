import { Server } from "socket.io";
import { Notification } from "../models/notification.model";

let io: Server | null = null;

export const initNotificationSocket = (socketIO: Server) => {
  io = socketIO;
};

/********************************
 * CREATE AND EMIT NOTIFICATION *
 ********************************/
export const createNotification = async ({
  to,
  message,
  type,
  id,
}: {
  // Accept flexible id types (ObjectId, string, or any) because callers sometimes
  // pass values coming from mongoose documents with loose typing.
  to: any;
  message: string;
  type: string;
  id: any;
}) => {
  const notification = await Notification.create({
    to,
    message,
    type,
    id,
  });

  // Emit live notification
  if (io) {
    io.to(to.toString()).emit("newNotification", notification);
  }

  return notification;
};
