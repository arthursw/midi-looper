import { instruments } from './instruments';
import { Sampler } from "tone";

let soundfontSelect: HTMLSelectElement = document.getElementById('soundfont') as HTMLSelectElement;
let instrumentSelect: HTMLSelectElement = document.getElementById('instrument') as HTMLSelectElement;
soundfontSelect.value = 'FatBoy';


// Empty select
while (soundfontSelect.firstChild) {
    soundfontSelect.firstChild.remove();
}

// Add all input options to the select
for (let soundfont in instruments) {
    let option = document.createElement("option");
    option.textContent = soundfont;
    option.setAttribute("value", soundfont);
    soundfontSelect.append(option);
}

soundfontSelect.addEventListener("change", soundfontChanged);

function soundfontChanged() {

    while (instrumentSelect.firstChild) {
        instrumentSelect.firstChild.remove();
    }

    for (let instrument of (instruments as any)[soundfontSelect.value]) {
        let option = document.createElement("option");
        option.textContent = instrument;
        option.setAttribute("value", instrument);
        instrumentSelect.append(option);
    }
    console.log((instruments as any))
    console.log((instruments as any)[soundfontSelect.value])
    console.log((instruments as any)[soundfontSelect.value][0])
    instrumentSelect.value = (instruments as any)[soundfontSelect.value][0];
    console.log(instrumentSelect.value)
    instrumentSelect.addEventListener("change", instrumentChanged);
}


let noteFiles: any = {}; 
let noteNames = ['A', 'Ab', 'B', 'Bb', 'C', 'D', 'Db', 'E', 'Eb', 'F', 'G', 'Gb']
for(let noteName of noteNames) {
  let startIndex = noteName == 'A' || noteName == 'B' || noteName == 'Bb' ? 0 : 1;
  for(let i=startIndex ; i<8 ; i++) {
    noteFiles[noteName + i] = noteName + i + '.mp3'
  }
}
export let synth: Sampler;
function instrumentChanged() {
    console.log(soundfontSelect.value)
    console.log(instrumentSelect.value)
    synth = new Sampler(noteFiles, {
        "release" : 1,
        // "baseUrl" : "/midi-js-soundfonts/" + soundfontSelect.value + "/" + instrumentSelect.value + "/"
        "baseUrl" : "https://gleitz.github.io/midi-js-soundfonts/" + soundfontSelect.value + "/" + instrumentSelect.value + "/"
      }).toMaster();
      return synth;
}

soundfontChanged();
instrumentChanged();