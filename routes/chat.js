export const chatHandler = async (request, env) => {
	let model = '@cf/mistral/mistral-7b-instruct-v0.1';
	let messages = [];
	let image = null;
	let error = null;

	// get the current time in epoch seconds
	const created = Math.floor(Date.now() / 1000);
	const uuid = crypto.randomUUID();
	try {
		// If the POST data is JSON then attach it to our response.
		if (request.headers.get('Content-Type') === 'application/json') {
			let json = await request.json();
			// when there is more than one model available, enable the user to select one
			if (json?.model) {
				const mapper = env.MODEL_MAPPER ?? {};
				model = mapper[json.model] ? mapper[json.model] : json.model;
			}
			if (json?.messages) {
				if (Array.isArray(json.messages)) {
					if (json.messages.length === 0) {
						return Response.json({ error: 'no messages provided' }, { status: 400 });
					}
					
					//Hard code to support vision models 
					for (let i = 0; i < json.messages.length; i++) {
						const temp = json.messages[i];
						const content = temp["content"];
						
						if (!Array.isArray(content)) {
							messages.push(temp);
						} else {
							let c = "";

							for (let j = 0; j < content.length; j++) {
								if (content[j].image_url != null) { //this is image
									console.log("This message contain image!!!!");
									image = content[j].image_url.url;
								} else {
									c = content[j].text;
								}
							}

							messages.push({
								"role": temp["role"],
								"content": c
							})
						}
					}

					// messages = json.messages;
				}
			}
			if (!json?.stream) json.stream = false;

			let buffer = '';
			const decoder = new TextDecoder();
			const encoder = new TextEncoder();
			const transformer = new TransformStream({
				transform(chunk, controller) {
					buffer += decoder.decode(chunk);
					// Process buffered data and try to find the complete message
					while (true) {
						const newlineIndex = buffer.indexOf('\n');
						if (newlineIndex === -1) {
							// If no line breaks are found, it means there is no complete message, wait for the next chunk
							break;
						}

						// Extract a complete message line
						const line = buffer.slice(0, newlineIndex + 1);
						// console.log(line);
						// console.log("-----------------------------------");
						buffer = buffer.slice(newlineIndex + 1); // Update buffer

						// Process this line
						try {
							if (line.startsWith('data: ')) {
								const content = line.slice('data: '.length);
								console.log(content);
								const doneflag = content.trim() == '[DONE]';
								if (doneflag) {
									controller.enqueue(encoder.encode("data: [DONE]\n\n"));
									return;
								}

								const data = JSON.parse(content);
								const newChunk =
									'data: ' +
									JSON.stringify({
										id: uuid,
										created,
										object: 'chat.completion.chunk',
										model,
										choices: [
											{
												delta: { content: data.response },
												index: 0,
												finish_reason: null,
											},
										],
									}) +
									'\n\n';
								controller.enqueue(encoder.encode(newChunk));
							}
						} catch (err) {
							console.error('Error parsing line:', err);
						}
					}
				},
			});

			// for now, nothing else does anything. Load the ai model.
			const aiResp = await env.AI.run(model, { stream: json.stream, messages, image: convertBase64ToBlob(image) });
			// Piping the readableStream through the transformStream
			return json.stream ? new Response(aiResp.pipeThrough(transformer), {
				headers: {
					'content-type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive',
				},
			}) : Response.json({
				id: uuid,
				model,
				created,
				object: 'chat.completion',
				choices: [
					{
						index: 0,
						message: {
							role: 'assistant',
							content: aiResp.response,
						},
						finish_reason: 'stop',
					},
				],
				usage: {
					prompt_tokens: 0,
					completion_tokens: 0,
					total_tokens: 0,
				},
			});
		}
	} catch (e) {
		error = e;
	}

	// if there is no header or it's not json, return an error
	if (error) {
		return Response.json({ error: error.message }, { status: 400 });
	}

	// if we get here, return a 400 error
	return Response.json({ error: 'invalid request' }, { status: 400 });
};

/**
 * Convert BASE64 to BLOB
 * @param base64Image Pass Base64 image data to convert into the BLOB
 */
function convertBase64ToBlob(base64Image) {
	// Split into two parts
	const parts = base64Image.split(';base64,');
  
	// Hold the content type
	const imageType = parts[0].split(':')[1];
  
	// Decode Base64 string
	const decodedData = atob(parts[1]);
  
	// Create UNIT8ARRAY of size same as row data length
	const uInt8Array = new Uint8Array(decodedData.length);
  
	// Insert all character code into uInt8Array
	for (let i = 0; i < decodedData.length; ++i) {
	  uInt8Array[i] = decodedData.charCodeAt(i);
	}
  
	// Return BLOB image after conversion
	// return new Blob([uInt8Array], { type: imageType });
	return Array.from(uInt8Array);
  }