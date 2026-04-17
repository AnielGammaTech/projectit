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
                    .foregroundColor(.white)

                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.projectName)
                        .font(.system(size: 14, weight: .semibold))
                        .lineLimit(1)
                        .foregroundColor(.white)

                    Text(context.attributes.startTime, style: .timer)
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundColor(.white.opacity(0.9))
                }

                Spacer()

                Image(systemName: "circle.fill")
                    .font(.system(size: 8))
                    .foregroundColor(.white)
                    .opacity(pulseAnimation())
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .activityBackgroundTint(Color.red)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded view
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: "timer")
                            .font(.system(size: 14))
                            .foregroundColor(.red)
                        Text(context.attributes.projectName)
                            .font(.system(size: 13, weight: .semibold))
                            .lineLimit(1)
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.startTime, style: .timer)
                        .font(.system(size: 15, weight: .bold, design: .monospaced))
                        .foregroundColor(.red)
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
                    .foregroundColor(.red)

            } compactTrailing: {
                // Compact trailing (right pill)
                Text(context.attributes.startTime, style: .timer)
                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                    .foregroundColor(.red)
                    .monospacedDigit()

            } minimal: {
                // Minimal (when competing with other activities)
                Image(systemName: "timer")
                    .font(.system(size: 12))
                    .foregroundColor(.red)
            }
        }
    }

    private func pulseAnimation() -> Double {
        return 1.0
    }
}
