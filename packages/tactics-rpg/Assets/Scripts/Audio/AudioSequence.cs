using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class AudioSequence : MonoBehaviour {

	#region Enum
	private enum PlayMode
	{
		Stopped,
		Playing,
		Paused
	}
	#endregion

	#region Fields
	Dictionary<AudioClip, AudioSequenceData> playMap = new Dictionary<AudioClip, AudioSequenceData>();
	PlayMode playMode = PlayMode.Stopped;
	double pauseTime;
	#endregion

	#region Public
	public void Play (params AudioClip[] clips) {
		if (playMode == PlayMode.Stopped)
			playMode = PlayMode.Playing;
		else if (playMode == PlayMode.Paused)
			UnPause();

		double startTime = GetNextStartTime();
		for (int i = 0; i < clips.Length; ++i) {
			AudioClip clip = clips[i];
			AudioSequenceData data = GetData(clip);
			data.Schedule(startTime);
			startTime += clip.length;
		}
	}

	public void Pause () {
		if (playMode != PlayMode.Playing)
			return;
		playMode = PlayMode.Paused;

		pauseTime = AudioSettings.dspTime;
		foreach (AudioSequenceData data in playMap.Values) {
			data.source.Pause();
		}
	}

	public void UnPause () {
		if (playMode != PlayMode.Paused)
			return;
		playMode = PlayMode.Playing;

		double elapsedTime = AudioSettings.dspTime - pauseTime;
		foreach (AudioSequenceData data in playMap.Values) {
			if (data.isScheduled)
				data.Schedule( data.startTime + elapsedTime );
			data.source.UnPause();
		}
	}

	public void Stop () {
		playMode = PlayMode.Stopped;
		foreach (AudioSequenceData data in playMap.Values) {
			data.Stop();
		}
	}

	public AudioSequenceData GetData (AudioClip clip) {
		if (!playMap.ContainsKey(clip)) {
			AudioSource source = gameObject.AddComponent<AudioSource>();
			source.clip = clip;
			playMap[clip] = new AudioSequenceData(source);
		}
		return playMap[clip];
	}
	#endregion

	#region Private
	AudioSequenceData GetFirst () {
		double lowestStartTime = double.MaxValue;
		AudioSequenceData firstData = null;
		foreach (AudioSequenceData data in playMap.Values) {
			if (data.isScheduled && data.startTime < lowestStartTime) {
				lowestStartTime = data.startTime;
				firstData = data;
			}
		}
		return firstData;
	}

	AudioSequenceData GetLast () {
		double highestEndTime = double.MinValue;
		AudioSequenceData lastData = null;
		foreach (AudioSequenceData data in playMap.Values) {
			if (data.isScheduled && data.endTime > highestEndTime) {
				highestEndTime = data.endTime;
				lastData = data;
			}
		}
		return lastData;
	}

	double GetNextStartTime () {
		AudioSequenceData lastToPlay = GetLast();
		if (lastToPlay != null && lastToPlay.endTime > AudioSettings.dspTime)
			return lastToPlay.endTime;
		else
			return AudioSettings.dspTime;
	}
	#endregion
}