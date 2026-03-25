import styles from "./PlayerReportPage.module.css";
import React from "react";
import {
    RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar, Legend,
    Tooltip
} from 'recharts';

function PlayerReportPage() {
    const data = [
        { skill: 'Communication', Emilija: 70 },
        { skill: 'Teamwork', Emilija: 80 },
        { skill: 'Problem Solving', Emilija: 65 },
        { skill: 'Leadership', Emilija: 50 },
        { skill: 'Time management', Emilija: 65 },
    ];
    const nickname = sessionStorage.getItem("nickname");
    if (!nickname) {
        return <div className={styles.error}>No player found.</div>
    }
    return (

        <div className={styles.page}>

            <h3>{nickname}'s skills</h3>
            <div className={styles.two}>
                <div>
                    <RadarChart width={700} height={500} data={data}
                        margin={{ top: 20, right: 100, bottom: 20, left: 100 }}
                        >
                        <PolarGrid />
                        <PolarAngleAxis 
                        dataKey="skill" 
                        tick={{fill: '#ffffff'}}/>
                        <PolarRadiusAxis angle={18} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar name="Emilija" dataKey="Emilija"
                            stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                        <Tooltip content={({ payload }) => {
                            if (payload && payload[0]) {
                                return (
                                    <div style={{ padding: '5px', border: '1px solid #ccc' }}>
                                        {payload[0].value}
                                    </div>
                                );
                            }
                            return null;
                        }}
                        />

                    </RadarChart>

                </div>
                <div className={styles.card}>
                    <h4>Overall</h4>
                    <hr />
                    <p>Score: <strong>65</strong></p>
                    <p>Top patterns: </p>
                    <ul>
                        <li>Proposed structured steps to organize team effort.</li>
                        <li>Consistently positive and encouraging.</li>
                        <li>Identified patterns but could have guided team more explicitly.</li>
                    </ul>
                    <p>Next Steps: </p>
                    <ul>
                        <li>Practice delegating specific tasks to teammates.</li>
                        <li>Continue modeling positive reinforcement to counterbalance negativity.</li>
                    </ul>
                </div>
            </div>

            <div className={styles.two}>
                <div className={styles.card}>
                    <h4>Communication</h4>
                    <hr />
                    <p>Score: <strong>70</strong></p>
                    <p>Strengths: </p>
                    <ul>
                        <li>Proposed clear steps ('Let's write what we have first').</li>
                        <li>Used positive reinforcement ('oooo Ieva').</li>
                    </ul>
                    <p>Area for improvement: </p>
                    <ul>
                        <li>Could have provided more detailed item descriptions.</li>
                    </ul>
                </div>
                <div className={styles.card}>
                    <h4>Teamwork</h4>
                    <hr />
                    <p>Score: <strong>80</strong></p>
                    <p>Strengths: </p>
                    <ul>
                        <li>Encouraged others; invited input ('What do you see?').</li>
                    </ul>
                    <p>Area for improvement: </p>
                    <ul>
                        <li>Could have more actively defused conflict.</li>
                    </ul>
                </div>
            </div>
            <div className={styles.two}>
                <div className={styles.card}>
                    <h4>Problem Solving</h4>
                    <hr />
                    <p>Score: <strong>65</strong></p>
                    <p>Strengths: </p>
                    <ul>
                        <li>Identified patterns (e.g., 'ring' category).</li>
                        <li>Asked clarifying questions ('What are the right ones?').</li>
                    </ul>
                    <p>Area for improvement: </p>
                    <ul>
                        <li>Could have proposed more structured solution steps.</li>
                    </ul>
                </div>
                <div className={styles.card}>
                    <h4>Leadership</h4>
                    <hr />
                    <p>Score: <strong>50</strong> </p>
                    <p>Strengths: </p>
                    <ul>
                        <li>Proposed a plan ('Let's write what we have first').</li>
                        <li>Motivated teammates ('no no, we are great').</li>
                    </ul>
                    <p>Area for improvement: </p>
                    <ul>
                        <li>Could have delegated tasks more clearly.</li>
                    </ul>
                </div>
            </div>
            <div className={styles.two}>
                <div className={styles.card}>
                    <h4>Time management</h4>
                    <hr />
                    <p>Score: <strong>65</strong></p>
                    <p>Strengths: </p>
                    <ul>
                        <li>Prompted progress checks ('Does anybody see any connections?').</li>
                        <li>Maintained positive tone under pressure.</li>
                    </ul>
                    <p>Area for improvement: </p>
                    <ul>
                        <li>Could have set clearer time expectations.</li>
                    </ul>
                </div>
            </div>


        </div>
    );
}
export default PlayerReportPage;