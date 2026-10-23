import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { useTransactions } from "@/context/transactions";
import { getApiUrl } from "@/lib/query-client";
import C from "@/constants/colors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Where am I spending the most?",
  "How can I save more money?",
  "Analyze my spending this month",
  "Am I on track with my expenses?",
];

function UserBubble({ content }: { content: string }) {
  return (
    <View style={styles.userBubbleRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{content}</Text>
      </View>
    </View>
  );
}

function AiBubble({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <View style={styles.aiBubbleRow}>
      <View style={styles.aiAvatar}>
        <Ionicons name="sparkles" size={14} color={C.green} />
      </View>
      <View style={styles.aiBubble}>
        <Text style={styles.aiBubbleText}>
          {content}
          {streaming && <Text style={styles.cursor}>▌</Text>}
        </Text>
      </View>
    </View>
  );
}

export default function AICoachScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, totalIncome, totalExpenses, balance } = useTransactions();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const listRef = useRef<FlatList>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 60);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
      };
      const capturedTxns = [...transactions];
      const capturedTotals = { income: totalIncome, expenses: totalExpenses, balance };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsSending(true);
      setStreamingContent("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scrollToBottom();

      const now = new Date();
      const context = {
        totalIncome: capturedTotals.income,
        totalExpenses: capturedTotals.expenses,
        balance: capturedTotals.balance,
        currentMonth: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      };

      try {
        const apiUrl = new URL("/api/ai/finance-coach", getApiUrl()).toString();
        const resp = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            transactions: capturedTxns.slice(0, 100).map((t) => ({
              type: t.type,
              amount: t.amount,
              category: t.category,
              date: t.date,
              note: t.note,
            })),
            context,
          }),
        });

        if (!resp.body) throw new Error("No response body");
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (!data) continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setStreamingContent(accumulated);
                  scrollToBottom();
                } else if (parsed.done) {
                  const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: accumulated,
                  };
                  setMessages((prev) => [...prev, aiMsg]);
                  setStreamingContent("");
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch {}
            }
          }
        }
      } catch {
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I couldn't process your request. Please try again.",
        };
        setMessages((prev) => [...prev, errMsg]);
        setStreamingContent("");
      } finally {
        setIsSending(false);
      }
    },
    [isSending, transactions, totalIncome, totalExpenses, balance, scrollToBottom]
  );

  const allMessages = [...messages];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={18} color={C.green} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Finance Coach</Text>
            <Text style={styles.headerSub}>Powered by Claude AI</Text>
          </View>
        </View>
        {messages.length > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setMessages([]);
              setStreamingContent("");
            }}
            style={styles.clearBtn}
          >
            <Ionicons name="trash-outline" size={16} color={C.lightGray} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={allMessages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: 8 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) =>
            item.role === "user" ? (
              <UserBubble content={item.content} />
            ) : (
              <AiBubble content={item.content} />
            )
          }
          ListHeaderComponent={
            messages.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="sparkles" size={36} color={C.green} />
                </View>
                <Text style={styles.emptyTitle}>Your Finance Coach</Text>
                <Text style={styles.emptySub}>
                  Ask me anything about your finances — spending patterns, saving tips, or budget advice.
                </Text>
                <View style={styles.quickGrid}>
                  {QUICK_PROMPTS.map((q, i) => (
                    <Pressable
                      key={i}
                      style={({ pressed }) => [
                        styles.quickBtn,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => sendMessage(q)}
                    >
                      <Text style={styles.quickBtnText}>{q}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={
            streamingContent ? (
              <AiBubble content={streamingContent} streaming />
            ) : isSending && !streamingContent ? (
              <View style={styles.aiBubbleRow}>
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={14} color={C.green} />
                </View>
                <View style={styles.aiBubble}>
                  <ActivityIndicator size="small" color={C.green} />
                </View>
              </View>
            ) : null
          }
          onContentSizeChange={scrollToBottom}
        />

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: botPad + 12 },
          ]}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask your Finance Coach..."
              placeholderTextColor={C.mediumGray}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              returnKeyType="default"
              editable={!isSending}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor:
                    input.trim() && !isSending ? C.green : C.card2,
                },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isSending}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={input.trim() && !isSending ? C.white : C.mediumGray}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.black },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.greenDim,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.white },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.lightGray },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  emptyState: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24, gap: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.greenDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.white },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.lightGray,
    textAlign: "center",
    lineHeight: 21,
  },
  quickGrid: { width: "100%", gap: 8, marginTop: 8 },
  quickBtn: {
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickBtnText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.offWhite },
  userBubbleRow: { alignItems: "flex-end" },
  userBubble: {
    maxWidth: "80%",
    backgroundColor: C.red,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userBubbleText: { fontFamily: "Inter_400Regular", fontSize: 15, color: C.white },
  aiBubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: C.greenDim,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiBubble: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  aiBubbleText: { fontFamily: "Inter_400Regular", fontSize: 15, color: C.offWhite, lineHeight: 22 },
  cursor: { color: C.green },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: C.black,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: C.offWhite,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
