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

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  userId: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");

  // Track login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen for this user's todos in real time
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
      }));
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
      createdAt: serverTimestamp(),
    });
    setNewTodo("");
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    await updateDoc(doc(db, "todos", id), { completed: !completed });
  };

  const removeTodo = async (id: string) => {
    await deleteDoc(doc(db, "todos", id));
  };

  if (loading) return <p>Loading...</p>;

  return (
    <main style={{ padding: "2rem", maxWidth: "500px", margin: "0 auto" }}>
      {user ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <img src={user.photoURL ?? ""} alt="profile" width={40} style={{ borderRadius: "50%" }} />
            <p>Welcome, {user.displayName}!</p>
            <button onClick={handleLogout}>Log out</button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
              placeholder="Add a new todo..."
              style={{ flex: 1, padding: "0.5rem" }}
            />
            <button onClick={addTodo}>Add</button>
          </div>

          <ul style={{ listStyle: "none", padding: 0 }}>
            {todos.map((todo) => (
              <li
                key={todo.id}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id, todo.completed)}
                />
                <span style={{ textDecoration: todo.completed ? "line-through" : "none", flex: 1 }}>
                  {todo.text}
                </span>
                <button onClick={() => removeTodo(todo.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button onClick={handleLogin}>Sign in with Google</button>
      )}
    </main>
  );
}