<script>
  import { writable } from "svelte/store";

  let sentence = "";
  let question = "";
  const messages = writable([]);

  async function addItem() {
    if (!sentence) return;
    try {
      const res = await fetch("http://localhost:3000/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence })
      });
      const data = await res.json();
      messages.update(msgs => [...msgs, { type: "bot", text: data.message }]);
    } catch {
      messages.update(msgs => [...msgs, { type: "bot", text: "Thêm thất bại" }]);
    }
    sentence = "";
  }

  async function askQuestion() {
    if (!question) return;
    messages.update(msgs => [...msgs, { type: "user", text: question }]);
    try {
      const res = await fetch("http://localhost:3000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      messages.update(msgs => [...msgs, { type: "bot", text: data.answer }]);
    } catch {
      messages.update(msgs => [...msgs, { type: "bot", text: "Lỗi server" }]);
    }
    question = "";
  }
</script>

<h1>Family Mini Chatbot</h1>

<div class="chat-window" style="border:1px solid #ccc; padding:10px; height:300px; overflow-y:scroll;">
  {#each $messages as msg}
    <div><b>{msg.type}</b>: {msg.text}</div>
  {/each}
</div>

<h2>Add Object</h2>
<input bind:value={sentence} placeholder="Describe object location" />
<button on:click={addItem}>Add/Update</button>

<h2>Ask Question</h2>
<input bind:value={question} placeholder="Ask where something is" />
<button on:click={askQuestion}>Ask</button>
