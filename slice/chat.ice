module chat {

    enum MessageType {
        TEXT,
        AUDIO
    };

    struct Message {
        string id;
        string from;
        string to;
        string scope;
        MessageType type;
        string text;
        string audioUrl;
        long createdAt;
        string mimeType;
        double duration;
    };

    // Secuencias deben declararse DESPUÉS del struct
    sequence<string> StringSeq;
    sequence<byte>   ByteSeq;
    sequence<Message> MessageSeq;

    interface ChatClient {
        void onMessage(Message m);
        void onAudioChunk(string streamId, int index, int total, ByteSeq data, string mimeType);
        void onAudioEnd(string streamId, string to, string from, string mimeType, double duration);
    };

    interface ChatService {
        void registerClient(string userId, ChatClient* cb);
        void unregisterClient(string userId);

        string createGroup(string name, StringSeq members);
        void sendText(string toType, string to, string fromUser, string text);

        MessageSeq getHistory(string scope, string id);

        string beginAudio(string toType, string to, string fromUser, string mimeType);
        void sendAudioChunk(string streamId, int index, int total, ByteSeq data);
        void endAudio(string streamId, double duration);
    };
};
