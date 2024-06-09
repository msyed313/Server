import express from 'express';
import { WebSocketServer } from 'ws';
import url from 'url';

const app = express();
const port = 8080;

// Increase the limit for JSON and URL-encoded payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

const wss = new WebSocketServer({ server });
let connectedClients = [];

wss.on('connection', (ws, req) => {
  const parameters = url.parse(req.url, true);
  const clientId = parameters.query.id;

  if (clientId) {
    ws.id = clientId;
    connectedClients.push(ws);
    console.log(`Client connected with id => ${ws.id}`);
    console.log('Current clients:', connectedClients.map(client => client.id));

    ws.on('message', (data) => {
      console.log(`Client message from ${ws.id}: ${data}`);
      // Handle incoming message
    });

    ws.on('close', () => {
      console.log(`Client with id ${ws.id} disconnected`);
      connectedClients = connectedClients.filter(client => client !== ws);
      console.log('Updated clients:', connectedClients.map(client => client.id));
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  } else {
    ws.close();
    console.log('Connection closed due to missing client ID.');
  }
});

app.post('/send-message', (req, res) => {
  const { clientId, message, image, senderId } = req.body;
  const client = connectedClients.find(client => client.id == clientId);
  if (client) {
    const payload = { senderId };
    if (image) {
      payload.type = 'image';
      payload.data = image;
      client.send(JSON.stringify(payload));
      console.log(`Image sent to Client ${clientId} from ${senderId}`);
      res.status(200).send(`Image sent to Client ${clientId}`);
    } else if (message) {
      payload.type = 'message';
      payload.data = message;
      client.send(JSON.stringify(payload));
      console.log(`Message sent to Client ${clientId} from ${senderId}: ${message}`);
      res.status(200).send(`Message sent to Client ${clientId}`);
    }
  } else {
    console.log(`Client ${clientId} not found in connected clients`);
    res.status(404).send(`Client ${clientId} not found`);
  }
});
app.post('/sendboth', (req, res) => {
  const { clientId, message, image, senderId } = req.body;
  const client = connectedClients.find(client => client.id == clientId);
  const sender = connectedClients.find(client => client.id == senderId);

  if (client && sender) {
    const payload = { senderId ,clientId};

    if (image) {
      payload.type = 'image';
      payload.data = image;
      client.send(JSON.stringify(payload));
      sender.send(JSON.stringify(payload));
      console.log(`Image sent to Client ${clientId} and Sender ${senderId}`);
      res.status(200).send(`Image sent to Client ${clientId} and Sender ${senderId}`);
    } else if (message) {
      payload.type = 'message';
      payload.data = message;
      client.send(JSON.stringify(payload));
      sender.send(JSON.stringify(payload));
      console.log(`Message sent to Client ${clientId} and Sender ${senderId}: ${message}`);
      res.status(200).send(`Message sent to Client ${clientId} and Sender ${senderId}`);
    }
  } else {
    if (!client) {
      console.log(`Client ${clientId} not found in connected clients`);
    }
    if (!sender) {
      console.log(`Sender ${senderId} not found in connected clients`);
    }
    res.status(404).send(`Client ${clientId} or Sender ${senderId} not found`);
  }
});

function sendToSpecificClient(clientId, message) {
    const client = connectedClients.find(client => client.id === clientId);
    if (client) {
        client.send(message);
        console.log(`Message sent to Client ${clientId}: ${message}`);
    } else {
        console.log(`Client ${clientId} not found in connected clients`);
    }
}

function sendToAllClientsExceptOne(id, message) {
    connectedClients.forEach(client => {
        if (client.id !== id) {
            client.send(message);
            console.log(`Message sent to Client ${client.id}: ${message}`);
        }
    });
}
