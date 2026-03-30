import ActivityKit
import Foundation

struct TimerAttributes: ActivityAttributes {
    // Fixed data that doesn't change during the activity
    public struct ContentState: Codable, Hashable {
        var elapsedSeconds: Int
    }

    // Static properties set when the activity starts
    var projectName: String
    var startTime: Date
}
