// === CUED TASK SWITCHING TASK ===
// 
// Adapted from Geddert et al. (2025)
//
// Task requires participants to evaluate numbers against two independent rules:
//      - Parity (even/odd)
//      - Magnitude (>5 / <5)
//
// Rules are mapped to distinct keys on the keyboard, "A" and "L".
// Rules are presented based on the color of a box surrounding the number.
// Blue = Parity
// Red = Magnitude
// This produces two trial types:
//      - Congruent
//          - Number cue and rule overlap onto the same key response
//      - Incongruent
//          - Number cue and rule prime both keys
//
// Rules can either be repeated, or switch. 
// 
// Thus, there are two distinct task elements: The number of times a rule switches, the number of incongruent trials presented. 
//
// These elements vary across 4 distinct blocks:
//      - Low switch, low incongruency 
//      - Low switch, high incongruency
//      - High switch, low incongruency
//      - High switch, high incongruency
//
// More detailed representation of task methodology is presented here: https://doi.org/10.3758/s13423-025-02712-7
//
// Experiment includes checks on performance to selectively exclude participants. 
// Performance criteria for exclusion:
//      -Stereotyped responding. Example: "A A A A A A A A A A A A A"
//      -Serial switching. Example: "A L A L A L A L A L A L A L A L"
//      -Rapid responding. Example: Mean reaction time < 200
//      -Disengaged respond. Example: Missing responses > 40% of the time
//      -Inability to learn task rules: Example: Failing practice block 4 times. 
//
// Performance feedback will be given at the end of the block.
// If participants meet 1+ of these conditions, they will be notified of exclusion. 
// This is to preserve financial credits + data quality
//
// Author: Siraj J. Lyons, MSc
// Date: 8/12/2026
// Implemented on Pavlovia using jsPsych

//=================================
// TO DO
//      - Add detection of button spamming
//          Constant response below 200 ms
//          Serial button presses
//          Alternating button presses (A - L - A - L)



// Organize practice task structure
const npracTrials = 20; // People will complete 20 trials for practice, 10 Magnitude and 10 Parity
const practiceAccCutoff = 75; // People must obtain 75% accuracy in practice to continue to task



// Organize task structure - Modify to your demands, or reduce for testing purposes -- CURRENTLY AT 5 TRIALS PER BLOCK FOR TESTING DATA STORAGE SUCCESS
const nblocks = 4;
const ntrials_per_block = 5;

// Create block dictionary 
const blockDef = [
    { blockNum: 1, switch_prob: 0.75, incon_prob: 0.25 },
    { blockNum: 2, switch_prob: 0.75, incon_prob: 0.75 },
    { blockNum: 3, switch_prob: 0.25, incon_prob: 0.25 },
    { blockNum: 4, switch_prob: 0.25, incon_prob: 0.75}
];

// Combination of switch_prob and incon_prob forms the 4-condition grid
// A = 75% switch, 25% incon
// B = 75% switch, 75% incon
// C = 25% switch, 25% incon
// D = 25% switch, 75% incon 

const con_stim = [2, 4, 7, 9];
const incon_stim = [1, 3, 6, 8];

const rule_color = { Par: "Red", Mag: "Blue" }; 
const cue_hex = { Red: "#ff4d4d", Blue: "#4d84ff" };

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randBool(pTrue) {
    return Math.random() < pTrue;
}

function flipRule(rule) {
    return rule === "Par" ? "Mag" : "Par";
}

// Build stimuli
function drawTaskStimulus(canvas, trialData) {

    if (!trialData) {
        console.error("Warning: trialData is undefined in drawTaskStimulus!");
        trialData = { cue_color: "Red", stimulus: "?" };
    }

    const ctx = canvas.getContext('2d');

    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Define cue color
    let strokeColor = "#ff4d4d"; // Parity = Red
    const ruleOrColor = String(trialData.cue_color || trialData.rule || "").toLowerCase();

    if (ruleOrColor.includes("mag") || ruleOrColor.includes("blue")) {
        strokeColor = "#4d84ff"; // Magnitude = Blue
    }

    // Draw cue
    ctx.lineWidth = 40;
    ctx.strokeStyle = strokeColor;
    ctx.strokeRect(30, 20, 340, 210);

    const num = (trialData.stimulus !== undefined) ? trialData.stimulus : "?";

    ctx.font = "bold 40px Arial";
    ctx.fillStyle = "#111111"; 
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Define numeric location
    ctx.fillText(num, canvas.width / 2, canvas.height / 2);
}

// Build stimuli
function buildStimulusHTML(trialData) {
    const colorKey = trialData.cue_color 
        ? trialData.cue_color.charAt(0).toUpperCase() + trialData.cue_color.slice(1).toLowerCase()
        : "Red";
    const hex = cue_hex[trialData.cue_color] || "#ffffff";

    return `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 300px;">
            <div style="
                border: 10px solid ${hex};
                padding: 40px 60px;
                border-radius: 16px;
                background-color: #ffffff;
                box-shadow: 0 6px 16px rgba(0,0,0,0.15);
                display: inline-block;
            ">
                <div style="
                    font-size: 1200px;
                    font-weight: bold;
                    color: #111111;
                    line-height: 1;
                    text-align: center;
                    font-family: Arial, sans-serif;
                ">
                    ${trialData.stimulus}
                </div>
            </div>
        </div>`;
}

// Identify correct response for trial
function correctResponse(rule, num, ruleMapping) {
    const isParity = String(rule).toLowerCase().includes("par");
    const isEven = (num % 2 === 0);
    const isLessThan5 = (num < 5);

    if (isParity) {
        return isEven ? ruleMapping.even : ruleMapping.odd;
    } else {
        return isLessThan5 ? ruleMapping.less : ruleMapping.greater;
    }

}

// Build practice block structure
function generatePrac(ruleMapping) {
    const trials = [];

    // Rules structure
    const rules = shuffle([
        ...Array(npracTrials / 2).fill("Mag"),
        ...Array(npracTrials / 2).fill("Par")
    ]);

    for (let t = 0; t < npracTrials; t++) {
        const rule = rules[t];
        const isIncongruent = randBool(0.5);
        const congruency = isIncongruent ? "Incon" : "Con";
        const stim = randChoice(isIncongruent ? incon_stim : con_stim);

        trials.push({
            block: "practice",
            trial: t + 1,
            rule: rule,
            cue_color: rule_color[rule],
            congruency: congruency,
            switch_type: t === 0 ? "NA" : (rule === rules[t - 1] ? "repeat" : "switch"),
            stimulus: stim,
            correct_response: correctResponse(rule, stim, ruleMapping)
        });
    }
    return trials;
}

function checkPoorPerform(blockData) {
    const nTrials = blockData.count();
    if (nTrials === 0) return false;

    const responses = blockData.select('responses').values;
    const rts = blockData.select('rt').values;

    // Check if participant is missing too many responses (inattentiveness or AFK)
    const missedTrialsCount = responses.filter(r => r === null || r === undefined).length;
    if ((missedTrialsCount / nTrials) >= 0.40) return true; // 40% trials can be missed -- liberal threshold to miminize false positive

    // Check if participant is spamming buttons
    const validRTs = rts.filter(rt => rt !== null);
    if (validRTs.length > 0) {
        const meanRT = validRTs.reduce((sum,val) => sum + val, 0) / validRTs.length;
        if (meanRT < 200) return true; // assuming 200 RT average is min-norm -- liberal threshold to minimize false positive
    }
    // Check if participant is serial-alternating responses
    const validResponses = responses.filter(r => r !== null);
    if (validResposnes.length > 10) {
        let keySwitches = 0;
        for (let i = 1; i < validResponses.length; i++) {
            if (validResponses[i] !== validResponses[i-1]) keySwitches++;
        }

        const switchRate = keySwitches / (validResponses.length - 1);

        // If the switch rate is at or less than 5%, participant is likely selecting the same key over and over again
        // If the switch rate is at or above 95%, participant is likely alternating key response
        if (switchRate <= 0.05 || switchRate >= 0.95) return true;
    }

    return false; // participant does not met criterial for bad performance. they can continue to next block
}


// Constructing practice trial loop
function buildPractice(practiceTrialData) {
    const practiceTimeline = [];

    practiceTrialData.forEach((trialData) => {
        practiceTimeline.push({
            type: jsPsychCanvasKeyboardResponse,
            canvas_size: [250, 400], // [Height, Width]
            stimulus: function (canvas) {
                return drawTaskStimulus(canvas, trialData);
            },
            choices: ["a", "l"],
            trial_duration: 2000,
            response_ends_trial: true,
            data: {
                task: "practice_task",
                block: "practice",
                trial: trialData.trial,
                rule: trialData.rule,
                stimulus_number: trialData.stimulus,
                correct_response: trialData.correct_response
            },
            on_finish: function (data) {
                data.correct = data.response === data.correct_response;
                data.no_response = data.response === null;
            }
        });

        // ITI + Feedback
        practiceTimeline.push({
            type: jsPsychHtmlKeyboardResponse,
            stimulus: function() {
                const lastTrial = jsPsych.data.get().last(1).values()[0];
                if (lastTrial.no_response) {
                    return '<div style="font-size:60px; color:orange; font-weight:bold;">Too Slow!</div>';
                }
                return lastTrial.correct
                    ? '<div style="font-size:60px; color:green; font-weight:bold;">Correct</div>'
                    : '<div style="font-size:60px; color:red; font-weight:bold;">Incorrect</div>';
            },
            choices: "NO_KEYS",
            trial_duration: 1300 // temp for now, adjust when finalizing
        });
    });
    return practiceTimeline
}

function createPracticeLoop(practiceTrialData) {
    const practiceInstructions = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
            <h2>Practice trials</h2>
            <p>You are going to complete ${npracTrials} practice trials.</p>
            <p>You must achieve at least <strong>${practiceAccCutoff}% accuracy</strong></p>
            <p>Press SPACE when you are ready to begin.</p>`,
        choices: [" "]
    };

    // Feedback
    const practiceSumm = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function () {
            // Calculate accuracy on 20 trials
            const lastPracSet = jsPsych.data.get()
                .filter({ task: "practice_task" })
                .last(npracTrials);
            
            const correctCount = lastPracSet.filter({ correct: true}).count();
            const accuracy = Math.round((correctCount / npracTrials) * 100);
            const passed = accuracy >= practiceAccCutoff;

            if (passed) {
                return `
                    <h2 style="color: green;">Practice is complete</h2>
                    <p>Your accuracy: <strong>${accuracy}%</strong></p>
                    <p>Press SPACE to begin the experiment.</p>
                `;
            } else {
                return `
                    <h2 style="color: red;">Your accuracy is <strong>${accuracy}</strong></p>
                    <p>You must achieve an accuracy of <strong>${practiceAccCutoff}</strong> or greater</p>
                    <p>Press SPACE to restart the practice block.</p>
                    `;
            }
        },
        choices: [" "]
    };

    // Build timeline
    return {
        timeline: [
            practiceInstructions,
            ...buildPractice(practiceTrialData),
            practiceSumm
        ],
        loop_function: function() {
            const lastPracSet = jsPsych.data.get()
                .filter({ task: "practice_task" })
                .last(npracTrials);

            const correctCount = lastPracSet.filter({ correct: true }).count();
            const accuracy = (correctCount / npracTrials) * 100;

            // Rule for practice block completion
            return accuracy < practiceAccCutoff;
        }
    };
}


// Build experiment sequence
function generateExp(ruleMapping = randChoice([1, -1])) {
    const blocks = [];

    blockDef.forEach(config => {
        const trials = [];

        // Trial 1 random  rule + congruency
        let rule = randChoice(["Par", "Mag"]);
        let congruency = randChoice(["Con", "Incon"]);
        let stim = randChoice(congruency == "Con" ? con_stim : incon_stim);

        trials.push({
            data: {
                task: "cued_task_switch",
                block: config.blockNum,
                trial: 1,
                rule,
                cue_color: rue_color[rule],
                congruency,
                switch_type: "NA",
                stimulus: stim,
                correct_response: correctResponse(rule, stim, ruleMapping),
            }
        });

        // Trial 2 and onward
        for (let t = 2; t <= ntrials_per_block; t++) {
            const isSwitch = randBool(config.switch_prob);
            rule = isSwitch ? flipRule(rule) : rule;

            const isIncongruent = randBool(config.incon_prob);
            congruency = isIncongruent ? "Incon" : "Con";
            stim = randChoice(isIncongruent ? incon_stim : con_stim);

            trials.push({
                data: {
                    task: "cued_task_switch",
                    block: config.blockNum,
                    trial: t,
                    rule,
                    cue_color: rule_color[rule],
                    congruency,
                    switch_type: isSwitch ? "switch" : "repeat",
                    stimulus: stim,
                    correct_response: correctResponse(rule, stim, ruleMapping)
                }
            });
        }
        blocks.push(trials);
    });
    return { ruleMapping, blocks };
}

// Module export for Node testing environments
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        generatePrac,
        generateExp,
        correctResponse,
        buildStimulusHTML,
        buildPracticeNodes,
        createPracticeLoopNode,
        npracTrials,
        practiceAccCutoff,
        nblocks,
        ntrials_per_block,
        switch_prob,
        incon_prob,
        con_stim,
        incon_stim,
        rule_color,
        cue_hex
    };
}