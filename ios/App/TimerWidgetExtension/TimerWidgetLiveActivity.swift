import ActivityKit
import WidgetKit
import SwiftUI

struct TimerWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimerAttributes.self) { context in
            // Lock Screen / StandBy banner
            HStack(spacing: 12) {
                Image(systemName: "timer")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.cyan)

                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.projectName)
                        .font(.system(size: 14, weight: .semibold))
                        .lineLimit(1)
                        .foregroundColor(.white)

                    Text(context.attributes.startTime, style: .timer)
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundColor(.cyan)
                }

                Spacer()

                Image(systemName: "circle.fill")
                    .font(.system(size: 8))
                    .foregroundColor(.red)
                    .opacity(pulseAnimation())
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .activityBackgroundTint(Color(red: 15/255, green: 30/255, blue: 46/255))

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded view
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: "timer")
                            .font(.system(size: 14))
                            .foregroundColor(.cyan)
                        Text(context.attributes.projectName)
                            .font(.system(size: 13, weight: .semibold))
                            .lineLimit(1)
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.startTime, style: .timer)
                        .font(.system(size: 15, weight: .bold, design: .monospaced))
                        .foregroundColor(.cyan)
                        .monospacedDigit()
                }

                DynamicIslandExpandedRegion(.bottom) {
                    Text("Tracking time")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }

            } compactLeading: {
                // Compact leading (left pill)
                Image(systemName: "timer")
                    .font(.system(size: 12))
                    .foregroundColor(.cyan)

            } compactTrailing: {
                // Compact trailing (right pill)
                Text(context.attributes.startTime, style: .timer)
                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                    .foregroundColor(.cyan)
                    .monospacedDigit()

            } minimal: {
                // Minimal (when competing with other activities)
                Image(systemName: "timer")
                    .font(.system(size: 12))
                    .foregroundColor(.cyan)
            }
        }
    }

    private func pulseAnimation() -> Double {
        return 1.0
    }
}
