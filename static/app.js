document.addEventListener("DOMContentLoaded", function () {
    const userInput = document.getElementById("userInput");
    const charCount = document.getElementById("charCount");
    const submitBtn = document.getElementById("submitBtn");
    const loader = document.getElementById("loader");
    const result = document.getElementById("result");

    // Character Counter
    userInput.addEventListener("input", () => {
        const count = userInput.value.length;
        charCount.textContent = `${count}/500 characters`;
        charCount.style.color = count > 500 ? "red" : "gray";
    });

    // Function to handle submission
    async function submitPrompt() {
        const text = userInput.value.trim();
        if (!text) {
            alert("Please enter some text!");
            return;
        }

        // Show loader and clear previous result
        loader.classList.remove("d-none");
        result.classList.add("d-none");

        try {
            // Send input to the backend
            const response = await fetch("/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text }),
            });

            const data = await response.json();

            // Handle response
            if (response.ok) {
                // Calculate word count of input text
                const wordCount = text.trim().split(/\s+/).length;
                document.getElementById('wordCountText').textContent = `${wordCount} words`;
                
                // Determine content level based on word count
                let contentLevel = 'Beginner';
                if (wordCount > 200) contentLevel = 'Advanced';
                else if (wordCount > 100) contentLevel = 'Intermediate';
                document.getElementById('contentLevelText').textContent = contentLevel;
                
                // Display dataset results and generate summary
                const datasetText = document.getElementById('datasetText');
                const summaryText = document.getElementById('summaryText');
                
                if (Array.isArray(data.dataset_result)) {
                    if (data.dataset_result.length > 0) {
                        // Display results
                        datasetText.innerHTML = data.dataset_result.map(result => 
                            `<div class="mb-3">
                                <h6 class="fw-bold">${result.title}</h6>
                                <p class="mb-0">${result.content}</p>
                            </div>`
                        ).join('');
                        
                        // Generate comprehensive summary
                        const summary = data.dataset_result.map(result => {
                            const content = result.content;
                            // Get first 150 characters of content as preview
                            const preview = content.length > 150 ? content.substring(0, 150) + "..." : content;
                            return `${result.title}: ${preview}`;
                        }).join('\n\n');
                        summaryText.textContent = `Found ${data.dataset_result.length} results:\n\n${summary}`;
                    } else {
                        datasetText.textContent = "No matching content found.";
                        summaryText.textContent = "No results to summarize.";
                    }
                } else {
                    datasetText.textContent = data.dataset_result;
                    summaryText.textContent = "No results to summarize.";
                }

                // Show results
                result.classList.remove("d-none");
            } else {
                document.getElementById('datasetText').textContent = `Error: ${data.error || "Something went wrong!"}`;
            }
        } catch (error) {
            document.getElementById('datasetText').textContent = `Error: ${error.message}`;
        } finally {
            loader.classList.add("d-none");
        }
    }

    // Button click handler
    submitBtn.addEventListener("click", submitPrompt);
});