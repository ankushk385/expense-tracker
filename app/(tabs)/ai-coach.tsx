import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccessiblePressable as Pressable } from "@/components/AccessiblePressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { useTransactions, Transaction } from "@/context/transactions";
import { getCategoryById, formatINR } from "@/constants/categories";
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

/**
 * The AI coach needs the Express server (and an Anthropic key). When that
 * isn't reachable we still answer from the local data instead of showing a
 * dead-end error.
 */
function buildOfflineAnswer(
  question: string,
  transactions: Transaction[],
  totals: { income: number; expenses: number; balance: number }
) {
  const q = question.toLowerCase();
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthExpenses = transactions.filter(
    (t) => t.type === "expense" && t.date.startsWith(monthPrefix)
  );
  const monthTotal = monthExpenses.reduce((sum, t) => sum + t.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const t of monthExpenses) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
  }
  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  const parts: string[] = [];

  if (top) {
    const label = getCategoryById(top[0])?.label ?? top[0];
    const pct = monthTotal > 0 ? Math.round((top[1] / monthTotal) * 100) : 0;
    parts.push(
      `Your biggest expense category this month is ${label} at ₹${formatINR(top[1])} (${pct}% of this month's spending).`
    );
  } else {
    parts.push("You haven't logged any expenses this month yet.");
  }

  parts.push(
    `This month you've spent ₹${formatINR(monthTotal)} across ${monthExpenses.length} transactions.`
  );

  const savingsRate =
    totals.income > 0
      ? Math.round(((totals.income - totals.expenses) / totals.income) * 100)
      : null;

  if (savingsRate !== null) {
    if (savingsRate >= 20) {
      parts.push(`You're saving about ${savingsRate}% of your income — that's a healthy rate.`);
    } else if (savingsRate >= 0) {
      parts.push(
        `You're saving about ${savingsRate}% of your income. Aim for 20% or more where possible.`
      );
    } else {
      parts.push(
        `You've spent ₹${formatINR(Math.abs(totals.balance))} more than you've earned so far.`
      );
    }
  }

  if (q.includes("save")) {
    parts.push(
      "Tip: set a monthly budget on your top category and review recurring spends first — small subscriptions add up quickly."
    );
  } else if (q.includes("budget") || q.includes("track")) {
    parts.push(
      "Open the Budgets tab to cap your biggest categories. Alerts fire at 80% of a budget by default."
    );
  }

  parts.push("AI server is offline right now, so this answer was generated on your device.");
  return parts.join("\n\n");
}

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

      let accumulated = "";

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

        if (!resp.ok || !resp.body) {
          throw new Error(`Coach unavailable (${resp.status})`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE events are separated by a blank line. A network chunk can
          // split an event in half, so keep the trailing partial event.
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            for (const line of event.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (!data) continue;

              let parsed: { text?: string; done?: boolean; error?: string };
              try {
                parsed = JSON.parse(data);
              } catch {
                continue;
              }

              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamingContent(accumulated);
                scrollToBottom();
              }
            }
          }
        }

        if (!accumulated.trim()) throw new Error("Empty response");

        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-ai`, role: "assistant", content: accumulated },
        ]);
        setStreamingContent("");
      } catch {
        // Server missing/unreachable (or no Anthropic key): answer from the
        // data already on the device instead of showing a dead end.
        const aiMsg: Message = {
          id: `${Date.now()}-offline`,
          role: "assistant",
          content: buildOfflineAnswer(userMsg.content, capturedTxns, capturedTotals),
        };
        setMessages((prev) => [...prev, aiMsg]);
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
            accessibilityLabel="Clear conversation"
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
                      accessibilityLabel={q}
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
            { paddingBottom: botPad + 64 },
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
              accessibilityLabel="Message to Finance Coach"
            />
            <Pressable
              accessibilityLabel="Send message"
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
