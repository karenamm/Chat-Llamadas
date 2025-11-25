# Chat en Tiempo Real con WebRTC, WebSocket y Cliente HTTP mediante Proxy Express  

Proyecto que implementa un **chat en tiempo real** con soporte para **mensajes**, **llamadas de voz** y ahora también un **cliente HTTP** que se comunica con el backend mediante un **proxy intermedio en Node.js (Express)**.  
El backend está desarrollado en **Spring Boot (Java)**, el cliente original en **Angular (TypeScript)**, y el nuevo cliente HTTP en **HTML, CSS y JavaScript puro**.  

---

##  Integrantes del Proyecto  

| Nombre completo | Rol |
|------------------|------|
| Karen Andrea Mosquera | Backend y Proxy HTTP |
| Luciano Barbosa Quintero | Integración y pruebas |

---

##  Requisitos Previos  

Asegúrate de tener instaladas las siguientes herramientas:  

- **Node.js** v18 o superior  
- **Angular CLI** (`npm install -g @angular/cli`)  
- **Java JDK 17 o superior**  
- **Maven** (para compilar el backend)  
- **IDE recomendado:** IntelliJ IDEA / VS Code  
- **Navegadores compatibles:** Google Chrome, Edge o Firefox  

---

##  Estructura del Proyecto  

```
/Chat-Llamadas
│
├── ms-chat-socket/                 # Backend principal en Java (Spring Boot)
│   ├── src/main/java/com/chat/socket/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── dto/
│   │   └── tcp/TcpJsonServer.java  # Servidor TCP para comunicación con el proxy
│   └── pom.xml
│
├── proxy-http/                     # Proxy HTTP + Cliente web
│   ├── server.js                   # Servidor Express (puerto 3000)
│   ├── backendClient.js            # Comunicación TCP JSON con el backend
│   ├── .env                        # Configuración del proxy (puertos/IP)
│   ├── package.json
│   └── web/
│       ├── index.html              # Cliente HTTP (HTML/CSS/JS)
│       ├── app.js
│       └── styles.css
│
└── frontend-angular/               # Cliente original (fase WebSocket/WebRTC)
    ├── src/app/
    │   ├── chat/
    │   │   ├── chat.ts
    │   │   ├── chat.html
    │   │   └── chat.css
    │   ├── services/chat.service.ts
    │   └── ...
    ├── package.json
    └── angular.json
```

---

##  Ejecución del Proyecto  

###  Clonar el repositorio  
```bash
git clone https://github.com/tuusuario/proyecto-chat.git
cd proyecto-chat
```

---

###  Ejecutar el **Backend (Spring Boot)**  

```bash
cd ms-chat-socket
mvn spring-boot:run
```

Verifica que aparezca:
```
[TCP] Json server escuchando en 127.0.0.1:9090
```

---

###  Ejecutar el **Proxy HTTP (Node.js)**  

```bash
cd ../proxy-http
npm install
npm start
```

Debe mostrarse:
```
Proxy escuchando en http://localhost:3000
Proxy → Java TCP 127.0.0.1:9090
```

---

###  Abrir el **Cliente HTTP**  

Abre en el navegador:
```
http://localhost:3000
```

Desde ahí podrás:
- Crear grupos de chat.  
- Enviar mensajes (texto o URL de audio).  
- Consultar el historial de mensajes.  

---

###  Ejecutar el **Frontend Angular (fase WebSocket/WebRTC)**  

```bash
cd ../frontend-angular
npm install
ng serve --host 0.0.0.0 --port 4200
```

Accede a:
```
http://localhost:4200
```

---

##  Conexión entre Computadores  

Si deseas probar en **dos PCs distintos**:

- Ambos deben estar **en la misma red local**.  
- En el archivo `chat.service.ts`, reemplaza:  
  ```ts
  const socket = new SockJS('http://localhost:8080/ws');
  ```  
  por:  
  ```ts
  const socket = new SockJS('http://<IP_DEL_BACKEND>:8080/ws');
  ```  
  *(Ejemplo: `http://192.168.1.5:8080/ws`)*  

Luego, abre el frontend en ambos equipos con nombres de usuario distintos y la misma sala (`roomId`).

---

##  Funcionalidades Principales  

- Envío de mensajes en tiempo real entre usuarios conectados a una misma sala.  
- Llamadas de voz (WebRTC) peer-to-peer entre usuarios.  
- Creación de grupos de chat.  
- Envío de mensajes vía HTTP mediante proxy Express.  
- Consulta de historial de mensajes (texto o audio).  
- Integración entre frontend, proxy y backend Java.  

---

##  Tecnologías Utilizadas  

| Componente | Tecnología |
|-------------|-------------|
| Frontend (WebSocket) | Angular 17 + TypeScript |
| Frontend (HTTP) | HTML + CSS + JavaScript |
| Proxy | Node.js + Express |
| Backend | Spring Boot 3 + Java 17 |
| Comunicación | HTTP → TCP (JSON por línea) |
| Llamadas | WebRTC |
| Estilos | CSS / Angular Forms |
| Servidor STUN | `stun:stun.l.google.com:19302` |

---

##  Flujo de Comunicación  

###  Fase WebSocket (anterior)
```
Cliente Angular (WebSocket/STOMP)
       ↓
Spring Boot (WebSocketController)
       ↓
Distribución de mensajes en tiempo real
       ↓
Usuarios conectados a la misma sala
```

###  Fase HTTP con Proxy Express (actual)
```
Cliente Web (HTML/JS)
       ↓ (fetch /api/...)
Proxy Express (HTTP)
       ↓ (TCP JSON por línea)
Backend Java (TcpJsonServer)
       ↓
Persistencia / memoria del sistema
```

---

##  Posibles Errores y Soluciones  

| Error | Causa | Solución |
|-------|--------|----------|
| `java_unavailable` | Backend no está escuchando en 9090 | Ejecutar Spring Boot y confirmar `[TCP] Json server escuchando...` |
| `405 Method Not Allowed` | Estás abriendo el HTML desde otro puerto | Acceder desde `http://localhost:3000` |
| `ECONNREFUSED` | Proxy no logra conectar al backend | Revisar `.env` y verificar puertos |
| `Cannot resolve symbol` en Java | Falta dependencia en Maven | Agregar `jackson-databind` y `jakarta.annotation-api` al `pom.xml` |

---

##  Ejemplo de Uso  

1. Ejecuta el backend y el proxy.  
2. Abre `http://localhost:3000`.  
3. Crea un grupo, envía un mensaje y consulta el historial.  
4. Observa las respuestas JSON en el navegador.  

---

##  Licencia  

Este proyecto fue desarrollado con fines académicos por los estudiantes:  
**Karen Andrea Mosquera** y **Luciano Barbosa Quintero.**  
Uso libre para aprendizaje y demostración.  
