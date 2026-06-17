require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Events } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// TASK QUEUE
let tasks = [];
let claimMessageId = null;

/**
 * ADMIN COMMANDS
 * !addtasks task1|task2|task3
 * !post (creates reaction message)
 */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ADD MULTIPLE TASKS
  if (message.content.startsWith("!addtasks")) {
    const list = message.content
      .replace("!addtasks", "")
      .split("|")
      .map(t => t.trim())
      .filter(Boolean);

    tasks.push(...list);

    return message.reply(`✅ Added ${list.length} tasks. Total queue: ${tasks.length}`);
  }

  // POST CLAIM MESSAGE
  if (message.content === "!post") {
    const msg = await message.channel.send(
      "📢 **Tasks are available! React with ✅ to claim one task.**"
    );

    await msg.react("✅");
    claimMessageId = msg.id;

    return;
  }
});

/**
 * REACTION SYSTEM
 */
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (user.bot) return;

    if (!reaction.message || !reaction.message.guild) return;
    if (reaction.message.id !== claimMessageId) return;
    if (reaction.emoji.name !== "✅") return;

    if (tasks.length === 0) {
      return user.send("❌ No tasks available right now.");
    }

    const task = tasks.shift();

    const guild = reaction.message.guild;

    // FIND USER TICKET (category = Tickets, channel name includes username)
    const ticketChannel = guild.channels.cache.find(ch =>
      ch.parent?.name?.toLowerCase() === "tickets" &&
      ch.name?.toLowerCase().includes(user.username.toLowerCase())
    );

    if (!ticketChannel) {
      return user.send("❌ No ticket found. Please create a ticket first.");
    }

    await ticketChannel.send(
      `🎯 **New Task Assigned**\n\n${task}\n\n👤 Worker: <@${user.id}>`
    );

    await user.send("✅ Task has been sent to your ticket.");
  } catch (err) {
    console.error("Reaction error:", err);
  }
});

/**
 * BOT READY
