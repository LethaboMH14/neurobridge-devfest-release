# NeuroBridge 2.0 | DevFest Johannesburg

## Builder notes

NeuroBridge helps South African learners understand their own study notes in English, isiZulu or Setswana. Learners can simplify concepts, explore a diagram, practise, and open the exact passage behind an answer. Review Today schedules a revisit after a mistake. Start with the Grade 11 runner lesson or paste your own notes.

The versioned system instructions and evaluation scenarios are under **Demo → System Prompt & Evidence** and **3 Scenarios & SRS**. Earlier preview testing showed a cited answer, a follow-up and an appropriately unsupported answer. The three planned end-to-end conversations were attempted on the later private checkpoint. Gemini quota blocked complete runs.

## Developer notes

React and TypeScript serve the learning workspace. Express uses the Gemini SDK server-side. The tutor validates a typed read-only passage lookup against the active lesson. Source excerpt matching, structured output validation, bounded request times and explicit error states support evidence-aware answers. The deterministic review scheduler covers immediate reviews and spaced retries.

Use the reviewed source archive or an approved repository containing this version. The original NeuroBridge repository represents the earlier project.

## Secure notes for both tracks

The release runs Gemini requests server-side and keeps the API credential in the hosting environment. The production bundle scan checks for Google API key patterns, private key markers and direct client environment references to the server key. Learners acknowledge processing before submitting custom notes or asking the tutor for the first time in a session. Browser saving defaults to off. Opting out or clearing data removes saved notes, tutor history, quiz progress and review schedules. The app restricts Google Search to eligible built-in sample questions without prior conversation or review context. API responses are marked no-store. JSON parse errors return a generic validation message.

A source and bundle scan cannot validate the configuration of a future host or the AI provider's retention settings. Before admitting learners, document the lawful basis, retention and handling of children's information for the intended use. The judge demo uses the curated sample or synthetic notes.

## Scale

The same Node application serves the built frontend and the Express API. Node.js 24 is the reference runtime. The included Dockerfile installs from the npm lockfile and checks types, tests, production build and the client bundle during the image build.

For direct hosting, use `npm ci`, `npm run lint`, `npm test`, `npm run build`, then `npm run check:bundle`. Start with `npm start`. Set `GEMINI_API_KEY` through the host's server-side secret settings. The app reads the port assigned by the host. Keep runtime configuration and credentials out of the submitted source.

1. Review the release differences before public publication. Deploy using a full-stack Node host or a container host. AI Studio's Publish flow for the original account requires a billed Google Cloud project.
2. Check that the deployed homepage and `/api/health` return HTTP 200. Run a live tutor question and check that the provider returns a sourced answer. A healthy server can still have exhausted Gemini quota.
3. Open the public HTTPS URL in a signed-out browser and on a physical phone. Verify the notes flow, the four mode tabs, an original passage, and the tutor.
4. Enter the verified URL in the Developer and Builder pre-checks. Confirm with the mentor whether Builder also needs the AI Studio share URL. Record the checks actually verified, then submit the track entries.

## Three learner conversations

| Scenario | First turn | Follow-up | Success evidence |
|---|---|---|---|
| Grade 11 runner | Ask where ATP comes from during glycolysis and lactate formation. | Ask for the explanation in isiZulu and the original passage. | Explanation switches language while original passage links stay valid. |
| Jozi school garden | Paste synthetic two-paragraph notes about blue rainwater tanks and which beds are watered first. Ask which beds are watered first. | Ask for tank capacity when the notes omit it. | P2 supports the first answer. The tutor reports insufficient source evidence for the second. |
| Practice recovery | Select nucleus for glycolysis, then use the cited feedback and retry with cytoplasm. | Ask what to review and why. | The miss creates an immediate review. A successful retry moves it to tomorrow without creating another concept record. |

## Release verification

- TypeScript and Vite build passed. The application suite passed 36 tests.
- The browser bundle credential scan passed.
- The production server served the homepage, hashed assets and health endpoint. Synthetic custom lesson ingestion succeeded. Malformed JSON returned a generic 400 and over-size input returned 413.
- A direct storage check verified default-off behaviour, opt-in persistence, deletion on revocation and deletion on Clear All Data. A direct scheduler check verified the miss and retry intervals.
- Public hosting, physical-phone checks, final live Gemini conversations, organizer verification and station stamps are pending.
