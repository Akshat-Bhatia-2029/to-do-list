"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";

type Difficulty = "Easy" | "Medium" | "Hard";

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Hard: 3,
  Medium: 2,
  Easy: 1,
};

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Hard: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Easy: "bg-emerald-100 text-emerald-700",
};

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  userId: string;
  difficulty: Difficulty;
}

function GoogleLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5c-2 1.5-4.6 2.5-7.6 2.5-5.2 0-9.6-3.3-11.3-7.9l-6.5 5c3.3 6.5 10 11.4 17.8 11.4z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C40.8 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>("Medium");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setTodos([]);
      return;
    }
    const q = query(
      collection(db, "todos"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Todo[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        text: doc.data().text,
        completed: doc.data().completed,
        userId: doc.data().userId,
        difficulty: (doc.data().difficulty as Difficulty) ?? "Medium",
      }));
      items.sort((a, b) => DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[a.difficulty]);
      setTodos(items);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const addTodo = async () => {
    if (!newTodo.trim() || !user) return;
    await addDoc(collection(db, "todos"), {
      text: newTodo,
      completed: false,
      userId: user.uid,
      difficulty: newDifficulty,
      createdAt: serverTimestamp(),
    });
    setNewTodo("");
    setNewDifficulty("Medium");
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    await updateDoc(doc(db, "todos", id), { completed: !completed });
  };

  const removeTodo = async (id: string) => {
    await deleteDoc(doc(db, "todos", id));
  };

  const updateDifficulty = async (id: string, difficulty: Difficulty) => {
    await updateDoc(doc(db, "todos", id), { difficulty });
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingText(todo.text);
  };

  const saveEdit = async (id: string) => {
    const trimmed = editingText.trim();
    if (trimmed) {
      await updateDoc(doc(db, "todos", id), { text: trimmed });
    }
    setEditingId(null);
  };

  const completedCount = todos.filter((t) => t.completed).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12">
      <div className="mx-auto max-w-md">
        {user ? (
          <>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <img
                  src={user.photoURL ?? ""}
                  alt="profile"
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{user.displayName}</p>
                  {todos.length > 0 && (
                    <p className="text-xs text-zinc-400">
                      {completedCount}/{todos.length} done
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-zinc-400 transition hover:text-zinc-700"
              >
                Log out
              </button>
            </div>

            {/* Add to-do input */}
            <div className="mb-4 flex gap-2">
              <input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTodo()}
                placeholder="What needs doing?"
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm outline-none transition focus:border-zinc-400"
              />
              <select
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(e.target.value as Difficulty)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <button
                onClick={addTodo}
                className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                Add
              </button>
            </div>

            {/* To-do list */}
            {todos.length === 0 ? (
              <p className="mt-10 text-center text-sm text-zinc-400">
                No to-dos yet — add one above!
              </p>
            ) : (
              <ul className="space-y-2">
                {todos.map((todo) => (
                  <li
                    key={todo.id}
                    className="group flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
                  >
                    <button
                      onClick={() => toggleTodo(todo.id, todo.completed)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        todo.completed
                          ? "border-zinc-900 bg-zinc-900"
                          : "border-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      {todo.completed && (
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Editable text for active todos, static for completed */}
                    {!todo.completed && editingId === todo.id ? (
                      <input
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => saveEdit(todo.id)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(todo.id)}
                        className="flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                      />
                    ) : (
                      <span
                        onClick={() => !todo.completed && startEditing(todo)}
                        className={`flex-1 text-sm transition ${
                          todo.completed
                            ? "text-zinc-400 line-through"
                            : "cursor-text text-zinc-900 hover:text-zinc-600"
                        }`}
                      >
                        {todo.text}
                      </span>
                    )}

                    {/* Editable difficulty for active todos, static badge for completed */}
                    {!todo.completed ? (
                      <select
                        value={todo.difficulty}
                        onChange={(e) => updateDifficulty(todo.id, e.target.value as Difficulty)}
                        className={`shrink-0 rounded-full border-none px-2 py-0.5 text-xs font-medium outline-none ${DIFFICULTY_STYLES[todo.difficulty]}`}
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    ) : (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_STYLES[todo.difficulty]}`}
                      >
                        {todo.difficulty}
                      </span>
                    )}

                    <button
                      onClick={() => removeTodo(todo.id)}
                      className="text-xs text-zinc-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 pt-32 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Task Organizer
            </h1>
            <p className="text-sm text-zinc-500">Sign in to get started</p>
            <button
              onClick={handleLogin}
              className="mt-2 flex items-center gap-3 rounded-xl bg-gradient-to-r from-sky-100 to-blue-200 px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:shadow-md"
            >
              <GoogleLogo />
              Sign in with Google
            </button>
          </div>
        )}
      </div>
    </main>
  );
}