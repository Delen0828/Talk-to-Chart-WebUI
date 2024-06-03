function getResponse(str) {
  // console.log(str)
  var index = str.indexOf("### Response:\n");
  if (index !== -1) {
      return str.substring(index + "### Response\n".length);
  } else {
      return "### Response: not found";
  }
}

function callApi() {
  const spec = document.getElementById('vega-lite-code').value;
  //   console.log()
  fetch(JSON.parse(spec)["data"]["url"])
    .then(response => response.text())
    .then(csvData => {
      // Remove all commas and newlines
      const cleanedData = csvData.replace(/[\n,]/g, ' ');
      // console.log(cleanedData); // Output the cleaned CSV data

      fetch('https://hl9x5y2d0gcrx6ye.us-east-1.aws.endpoints.huggingface.cloud/', {
        method: 'POST',
        headers: {
          "Accept" : "application/json",
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          // model: 'chart2text-1024-qfw',
          "inputs": `Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.\n\n### Instruction:\n${spec}\n\n### Input:\n ${cleanedData}\n\n### Response:\n`,
          "parameters": {}
          // max_tokens: 256,
          // temperature: 0
        })
      })
        .then(response => response.json())
        .then(data => {
          console.log(data[0])
          const responseContainer = document.getElementById('api-response');
          responseContainer.innerHTML = JSON.stringify(getResponse(data[0]['generated_text']), null, 2);
          // const responseList = data["choices"][0]["text"].split('. ').filter(Boolean);
          // console.log(responseList);
        })
        .catch(error => {
          const responseContainer = document.getElementById('api-response');
          responseContainer.innerHTML = `<p style="color: red;">Error calling API: ${error.message}</p>`;
        });
    })
    .catch(error => console.error('Error fetching CSV file:', error));
}
 
async function query(data) {
  const HF_key = document.getElementById("HF_key").value;
  const response = await fetch(
    "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
    {
      headers: { Authorization: `${HF_key}` },
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  const result = await response.json();
  return result;
}

function indexOfMax(arr) {
  if (arr.length === 0) {
    return -1; // Return -1 for empty array
  }

  const max = Math.max(...arr); // Find the maximum value in the array
  return arr.indexOf(max); // Find the index of the maximum value
}

function getFirstColumn(csvData) {
  // Split the CSV data into rows
  let rows = csvData.split('\n');

  // Initialize an empty array to store the first column values
  let wordList = [];

  // Loop through each row
  for (let i = 0; i < rows.length; i++) {
    // Split the row into columns
    let columns = rows[i].split(',');

    // Add the first column value to the wordList array
    if (columns[0] !== undefined) {
      wordList.push(columns[0]);
    }
  }

  return wordList;
}

let recognition; // Declare recognition object

// Function to start speech recognition
function startSpeechRecognition() {
  recognition = new webkitSpeechRecognition(); // Create speech recognition object
  recognition.lang = 'en-US'; // Set recognition language
  recognition.start(); // Start recognition

  // Event listener for speech recognition result
  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript; // Get transcript
    const speechResult = document.getElementById('speech-result');
    speechResult.innerHTML = transcript; // Display transcript
    const responseList = document.getElementById('api-response').innerHTML.split('. ').filter(Boolean);

    query({
      "inputs": {
        "source_sentence": transcript,
        "sentences": responseList
      }
    }).then((response) => {
      console.log(JSON.stringify(response));
      const matchContainer = document.getElementById("match-sentence");
      const target = responseList[indexOfMax(response)];
      matchContainer.innerHTML = target;

      const spec = document.getElementById('vega-lite-code').value;
      fetch(JSON.parse(spec)["data"]["url"])
        .then(response => response.text())
        .then(csvData => {
          // Remove all commas and newlines
          // const DataTable = csvData.replace(/[\n,]/g, ' ');
          let wordList = getFirstColumn(csvData);
          const OPENAI_key = document.getElementById("OPENAI_key").value;
          // console.log(target, wordList)
          fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `${OPENAI_key}`, // Replace with your API key
            },
            body: JSON.stringify({
              model: "gpt-4-turbo",
              messages: [
                { role: "system", content: "You are a helpful assistant for labeling datasets.  Return only the label without explanation." },
                { role: "user", content: "You need to label FACT with different tasks and retrieve key values or words from DATA. The tasks include: HIGHLIGHT_ONE (value or word), COMPARE_TWO (value1, value2 or word1, word2), ADD_THRESHOLD (value), LOCAL_TREND (value1 and value2), GLOBAL_TREND (no value, no word)." },
                { role: "assistant", content: "I understand. I will just classify." },
                { role: "user", content: "FACT: The ticket price shown for 2006 is just over 60 dollars, and it rises from that point to just over 100 dollars in 2018. DATA: Year Ticket price in U.S. dollars Dec 31, 2005 62.38 Dec 31, 2006 67.11 Dec 31, 2007 72.2 Dec 31, 2008 74.99 Dec 31, 2009 76.47 Dec 31, 2010 77.34 Dec 31, 2011 78.38 Dec 31, 2012 81.54 Dec 31, 2013 84.43 Dec 31, 2014 85.83 Dec 31, 2015 92.98 Dec 31, 2017 100.26 Dec 31, 2018 102.35" },
                { role: "assistant", content: "COMPARE_TWO, 2006, 2018" },
                { role: "user", content: "FACT: Viewers of Minecraft on twitch has gradually increased between 2018 and 2020. DATA: Month Number of viewers in thousands Dec 31, 2017 5.37 Jan 31, 2018 4.96 Feb 28, 2018 4.87 Mar 31, 2018 5.55 Apr 30, 2018 4.13 May 31, 2018 4.27 Jun 30, 2018 7.06 Jul 31, 2018 7.17 Aug 31, 2018 5.6 Sep 30, 2018 5.91 Oct 31, 2018 5.96 Nov 30, 2018 8.58 Dec 31, 2018 14.53 Jan 31, 2019 9.33 Feb 28, 2019 7.31 Mar 31, 2019 8.55 Apr 30, 2019 11.98 May 31, 2019 23.72 Jun 30, 2019 25.15 Jul 31, 2019 44.01 Aug 31, 2019 32.79 Sep 30, 2019 20.32 Oct 31, 2019 21.92 Nov 30, 2019 22.81 Dec 31, 2019 25.18 Jan 31, 2020 24.7 Feb 29, 2020 30.82 Mar 31, 2020 57.2 Apr 30, 2020 55.28 May 31, 2020 54.01 Jun 30, 2020 71.07 Jul 31, 2020 54.16 Aug 31, 2020 54.13 Sep 30, 2020 66.99 Oct 31, 2020 106.29" },
                { role: "assistant", content: "LOCAL_TREND, 2018, 2020" },
                { role: "user", content: "FACT: There are thousands of Bayern Munich fans and this number has seen a steady growth over the last twelve years. DATA: Number of fan club members in thousands Season 350.92 Nov 2018 340.47 2017/18 330.56 2016/17 325.42 2015/16 306.77 2014/15 283.56 2013/14 262.08 2012/13 231.2 2011/12 204.24 2010/11 190.75 2009/10 181.69 2008/09 176.98 2007/08 164.58 2006/07 156.67 2005/06" },
                { role: "assistant", content: "GLOBAL_TREND" },
                { role: "user", content: "FACT: The majorly of the big cities are at 3 index points. DATA: big city Index points Omsk 3.6 Novosibirsk 3.4 Krasnoyarsk 3.2 Volgograd 3.1 Perm 3.1 Voronezh 3.1 Nizhny Novgorod 3 Samara 3 Ufa 3 Yekaterinburg 3 Saint Petersburg 3 Rostov-on-Don 3 Chelyabinsk 3 Moscow 2.9 Kazan 2.6" },
                { role: "assistant", content: "ADD_THRESHOLD, 3" },
                { role: "user", content: "FACT: Omsk has the largest value of 3.5 index points. DATA: big city Index points Omsk 3.6 Novosibirsk 3.4 Krasnoyarsk 3.2 Volgograd 3.1 Perm 3.1 Voronezh 3.1 Nizhny Novgorod 3 Samara 3 Ufa 3 Yekaterinburg 3 Saint Petersburg 3 Rostov-on-Don 3 Chelyabinsk 3 Moscow 2.9 Kazan 2.6" },
                { role: "assistant", content: "HIGHLIGHT_ONE, Omsk" },
                { role: "user", content: `FACT: ${target} DATA: ${wordList}` }, // Using the target message here
              ],
              temperature: 0
            }),
          }).then(response => response.json())
            .then(data => {
              let taskList = data.choices[0].message.content.split(", ");
              console.log(taskList)
              const parsedData = d3.csvParse(csvData);
              // console.log(parsedData)
              let task = taskList[0];
              let vega = JSON.parse(document.getElementById('vega-lite-code').value);
              let fieldAndType = getMainSubFieldType(vega);
              let mainField = fieldAndType[0];
              let mainType = fieldAndType[1];
              let subField = fieldAndType[2];
              let subType = fieldAndType[3];
              let newList = []
              fetch(vega["data"]["url"]).then(response => response.text())
                .then(csvData => {
                  let wordList = getFirstColumn(csvData);
                  // console.log(wordList);
                  if (taskList.length > 1) {
                    let queryPromises = [];
                    for (let i = 1; i < taskList.length; i++) {
                      queryPromises.push(
                        query({
                          "inputs": {
                            "source_sentence": taskList[i],
                            "sentences": wordList
                          }
                        }).then((response) => {
                          console.log(JSON.stringify(response));
                          return wordList[indexOfMax(response)];
                        }));
                    }
                    return Promise.all(queryPromises)
                      .then(results => {
                        newList.push(...results);
                        console.log(newList);
                        if (vega["mark"] == 'bar') {
                          if (task == 'HIGHLIGHT_ONE') {
                            let newVega = barHighlightOne(vega, mainField, newList[0]);
                            reRenderVegaLite(newVega);
                          }
                          if (task == 'COMPARE_TWO') {
                            let newVega = barCompareTwo(vega, mainField, newList[0], newList[1]);
                            reRenderVegaLite(newVega);
                          }
                          if (task == 'ADD_THRESHOLD') {
                            let newVega = barThreshold(vega, subField, newList[0]);
                            reRenderVegaLite(newVega);
                          }
                          if (task == 'LOCAL_TREND') {
                            let newVega = barLocalTrend(vega, mainType, newList[0], newList[1]);
                            reRenderVegaLite(newVega);
                          }
                        }
                        if (vega["mark"] == 'line' || vega["mark"] == 'area') {
                          if (task == 'HIGHLIGHT_ONE') {
                            let newVega = lineHighlightOne(vega, mainField, subField, mainType, subType, newList[0]);
                            reRenderVegaLite(newVega);
                          }
                          if (task == 'COMPARE_TWO') {
                            let newVega = lineCompareTwo(vega, mainField, subField, mainType, subType, newList[0], newList[1]);
                            reRenderVegaLite(newVega);
                          }
                          if (task == 'ADD_THRESHOLD') {
                            let newVega = lineThreshold(vega, subField, newList[0]);
                            reRenderVegaLite(newVega);
                          }
                          if (task == 'LOCAL_TREND') {
                            let newVega = lineLocalTrend(vega, mainType, newList[0], newList[1]);
                            reRenderVegaLite(newVega);
                          }
                        }
                      });
                  }
                  else {
                    if (vega["mark"] == 'bar') {
                      let newVega = barGlobalTrend(vega, mainField, subField, mainType, subType,parsedData);
                      // console.log(JSON.stringify(newVega))
                      reRenderVegaLite(newVega);
                    }
                    if (vega["mark"] == 'line' || vega["mark"] == 'area') {
                      let newVega = lineGlobalTrend(vega, mainField, subField, mainType, subType, parsedData);
                      reRenderVegaLite(newVega);
                    }
                  }
                  
                })
            });
        });
    });
  };

  // Event listener for speech recognition error
  recognition.onerror = function (event) {
    const speechResult = document.getElementById('speech-result');
    speechResult.innerHTML = `<p style="color: red;">Error: ${event.error}</p>`;
  };
}

// Function to stop speech recognition
function stopSpeechRecognition() {
  if (recognition) {
    recognition.stop(); // Stop recognition
  }
}

// Event listener for button mousedown event
document.getElementById('speech-button').addEventListener('mousedown', function () {
  startSpeechRecognition();
  document.getElementById('speech-button').innerHTML = 'Recording...';
});

// Event listener for button mouseup event
document.getElementById('speech-button').addEventListener('mouseup', function () {
  stopSpeechRecognition();
  document.getElementById('speech-button').innerHTML = 'Start Recording';
});