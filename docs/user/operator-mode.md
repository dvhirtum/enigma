# Operator's notebook

[Back to the contents](README.md)

The operator's notebook walks through the Navy indicator procedure while you work the machine. Open it with the message pad button at the top right. It opens in its own window, so you can place it next to the machine.

The notebook looks like squared paper. The instructions are printed; everything the operator would write down (groups, indicator, keys, cipher text and plaintext) is handwritten, one letter per square. The numbered steps run down the page, each with its instructions and what was written in it. The current step is highlighted and the notebook scrolls to it. Finished steps are ticked off and keep everything, so you can read back the whole procedure once the message is done.

Turn the rotors in the [top-down view](machine.md) of the machine window. Type there, or type letters straight into the notebook: they press the machine keys. Keys other than the expected one are rejected; the message about it fades out after 5 seconds. **Cancel** stops the procedure at any time.

The **Encrypt** tab sends, the **Decrypt** tab receives, and the **Lamps** tab writes down every lamp that lights. One message can be in progress at a time. While it is, the other tab asks you to finish or cancel it first. Once it is done, the other tab works as usual; starting a message there replaces the finished one.

To work through the same steps without guidance, see [Sending by hand](sending-by-hand.md) and [Receiving by hand](receiving-by-hand.md). [The Enigma in the Kriegsmarine](history.md) explains why the procedure works this way.

## Sending

Sending needs an applied daily key (see [Key sheets](key-sheets.md)). The notebook warns when the setup differs from the key.

1. On the **Encrypt** tab, click **Send a message**.
2. **Choose the groups.** Pick a Schlüsselkenngruppe from your network's columns and a Verfahrenkenngruppe from the Verfahrenkenngruppen columns, or click **Random**. Enter two filler letters and click **Encrypt indicator**. The notebook writes out the indicator, the bigram swaps from the Tauschtafel and the two indicator groups.
3. **Set the Grundstellung.** Turn the rotors until the windows show it.
4. **Type the Verfahrenkenngruppe.** The lamps give the Spruchschlüssel (message key), which the notebook writes down.
5. **Set the Spruchschlüssel.** On the M4 the Greek rotor keeps its Grundstellung letter.
6. **Type the message.** The notebook writes the plaintext in groups of 4 with the cipher text under each letter, and the cipher text again in groups below. Type X until the last group is full, then click **Finish**.
7. Click **Copy** to copy the radio message. The notebook explains the numbers at its start.

A radio message looks like this:

```
1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI
```

The time of origin and the letter count come first. The two indicator groups stand at the start and the end.

## Receiving

1. On the **Decrypt** tab, paste the message under **Received message**. The date is filled in from the applied key, or today.
2. Click **Find key**. The notebook lists the key sheet days whose network the Schlüsselkenngruppe belongs to. Click **Receive with this key**. If the right key is already applied, click **Receive with applied key** instead.
3. Set the Grundstellung, type the Verfahrenkenngruppe and set the Spruchschlüssel, as when sending. The Verfahrenkenngruppe step explains the indicator: which Kenngruppenbuch column the Schlüsselkenngruppe comes from and which network that column is allotted to, and which column the Verfahrenkenngruppe comes from.
4. Type the cipher text. The next letter is circled, and the plaintext is written under each cipher letter and again in groups below.

The notebook warns when the letter count differs, when the Schlüsselkenngruppe does not belong to the network, or when the Verfahrenkenngruppe is not one.

Click **New message** to start again.

## Lamps

The **Lamps** tab writes down every lamp that lights on the machine, in groups of 4, whether you type in the machine window or in the notebook. Use it to work a message by hand without the guided steps. **Copy** puts them on the clipboard as groups of 4. The lamps stay written down when the machine is set up again; click **Clear** to start a clean page.
