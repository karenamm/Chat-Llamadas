# Chat en Tiempo Real con WebRTC y WebSocket  

Proyecto que implementa un **chat en tiempo real** con soporte para **mensajes** y **llamadas de voz** entre usuarios conectados a la misma sala.  
El backend está desarrollado en **Spring Boot (Java)** y el frontend en **Angular (TypeScript)**.  

---

## 👥 Integrantes del Proyecto  

| Nombre completo | Rol |
|------------------|------|
| Karen Andrea Mosquera | Backend |
| Luciano Barbosa Quintero | Integración y pruebas |
| Joshua Sayur Gallego | Frontend |

---

## ⚙️ Requisitos Previos  

Asegúrate de tener instaladas las siguientes herramientas:  

- **Node.js** v18 o superior  
- **Angular CLI** (`npm install -g @angular/cli`)  
- **Java JDK 17 o superior**  
- **Maven** (para compilar el backend)  
- **IDE recomendado:** IntelliJ IDEA / VS Code  
- **Navegadores compatibles:** Google Chrome, Edge o Firefox  

---

## 🏗️ Estructura del Proyecto  

```
/proyecto-chat
│
├── backend-chat/
│   ├── src/main/java/com/chatapp/
│   ├── pom.xml
│   └── ...
│
└── frontend-chat/
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

## 🚀 Ejecución del Proyecto  

### 1️⃣ Clonar el repositorio  
```bash
git clone https://github.com/tuusuario/proyecto-chat.git
cd proyecto-chat
```

### 2️⃣ Ejecutar el **Backend**  

```bash
cd backend-chat
mvn spring-boot:run
```

### 3️⃣ Ejecutar el **Frontend**  

```bash
cd ../frontend-chat
npm install
ng serve --host 0.0.0.0 --port 4200
```
Accede a:
```
http://localhost:4200
```

---

## 🌐 Conexión entre Computadores  

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

## 💬 Funcionalidades Principales  

✅ Envío de mensajes en tiempo real entre usuarios conectados a una misma sala.  
✅ Llamadas de voz (WebRTC) peer-to-peer entre usuarios.  
✅ Generación dinámica de colores de usuario.  
✅ Soporte para múltiples salas de chat.  
✅ Interfaz limpia y responsiva con Angular.  

---

## 🧩 Tecnologías Utilizadas  

| Componente | Tecnología |
|-------------|-------------|
| Frontend | Angular 17 + TypeScript |
| Backend | Spring Boot 3 + WebSocket |
| Comunicación | STOMP + SockJS |
| Llamadas | WebRTC |
| Estilos | CSS / Angular Forms |
| Servidor STUN | `stun:stun.l.google.com:19302` |

---

## 🧠 Cómo Funciona  

1. Cada usuario se conecta a una sala (`roomId`) a través de WebSocket.  
2. Los mensajes se envían y distribuyen mediante STOMP sobre SockJS.  
3. Para llamadas, se intercambian descripciones SDP e ICE Candidates (señalización).  
4. WebRTC establece conexión directa entre los dos clientes para transmitir audio.  

---

## 🛠️ Posibles Errores y Soluciones  

| Error | Causa | Solución |
|-------|--------|----------|
| `Can't bind to 'ngModel'` | Falta de importación de FormsModule | Asegúrate que `imports: [FormsModule]` esté en el componente |
| `No pipe found with name 'uppercase'` | Falta CommonModule | Añadir `CommonModule` al array de imports |
| `This expression is not constructable` | Uso incorrecto de SockJS | Importar correctamente con `import SockJS from 'sockjs-client'` |
| Los mensajes no llegan al otro PC | Conexión a IP incorrecta o backend inaccesible | Cambiar `localhost` por la IP local del backend |

---

## 📸 Ejemplo de Uso  

1. Inicia backend y frontend.  
2. Abre `http://localhost:4200` en dos navegadores o PCs.  
3. Ingresa:  
   - Usuario A → sala `general`  
   - Usuario B → sala `general`  
4. Envíen mensajes o inicien una llamada de voz.  

---

## 🧾 Licencia  

Este proyecto fue desarrollado con fines académicos por los estudiantes:  
**Karen Andrea Mosquera**, **Luciano Barbosa Quintero** y **Joshua Sayur Gallego**.  
Uso libre para aprendizaje y demostración.  
